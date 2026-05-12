const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://schools.by';
const sessions = new Map();

class CookieJar {
  constructor() {
    this.cookies = {};
    this.client = axios.create({
      baseURL: BASE,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      }
    });
    this.client.interceptors.response.use(res => {
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        setCookie.forEach(raw => {
          const pair = raw.split(';')[0];
          const [key, ...rest] = pair.split('=');
          if (key) this.cookies[key.trim()] = rest.join('=').trim();
        });
      }
      return res;
    });
    this.client.interceptors.request.use(cfg => {
      const cookieStr = Object.entries(this.cookies).map(([k,v]) => ${k}=${v}).join('; ');
      if (cookieStr) cfg.headers['Cookie'] = cookieStr;
      return cfg;
    });
  }
  get(url, config = {}) { return this.client.get(url, config); }
  post(url, data, config = {}) {
    return this.client.post(url, new URLSearchParams(data), {
      ...config,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...config.headers }
    });
  }
}

function randomToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function requireSession(token) {
  const session = sessions.get(token);
  if (!session) throw new Error('Сессия не найдена. Войдите заново.');
  return session;
}

async function login(username, password) {
  const jar = new CookieJar();
  const loginPageRes = await jar.get('/login');
  const $ = cheerio.load(loginPageRes.data);
  const csrf = $('input[name="csrfmiddlewaretoken"]').val();
  if (!csrf) throw new Error('Не удалось найти CSRF-токен');
  const loginRes = await jar.post('/login', {
    username, password, csrfmiddlewaretoken: csrf, next: '/'
  }, { headers: { 'Referer': ${BASE}/login } });
  const $after = cheerio.load(loginRes.data);
  const isLoggedIn = $after('[href*="logout"]').length > 0;
  if (!isLoggedIn) {
    const errMsg = $after('.errorlist li').first().text() || 'Неверный логин или пароль';
    throw new Error(errMsg);
  }
  const name = $after('.user-name').first().text().trim();
  const classInfo = $after('.class-name').first().text().trim();
  let studentId = null;
  $after('a[href*="/pupil/"]').each((_, el) => {
    const m = $after(el).attr('href').match(/\/pupil\/(\d+)/);
    if (m) { studentId = m[1]; return false; }
  });
  const sessionToken = randomToken();
  sessions.set(sessionToken, { jar, studentId, name, classInfo, username });
  return { token: sessionToken, name, classInfo, studentId };
}

async function getGrades(sessionToken) {
  const { jar, studentId } = requireSession(sessionToken);
  const url = studentId ? /pupil/${studentId}/dnevnik/ : '/dnevnik/';
  const res = await jar.get(url);
  const $ = cheerio.load(res.data);
  const subjects = [];
  $('table.marks-tbl tr').each((_, row) => {
    const $row = $(row);
    const name = $row.find('td:first-child').text().trim();
    if (!name) return;
    const grades = [];
    $row.find('td.mark').each((_, cell) => {
      const val = parseInt($(cell).text().trim());
      if (val >= 1 && val <= 10) grades.push(val);
    });
    if (grades.length > 0) {
      const avg = grades.reduce((a,b) => a+b, 0) / grades.length;
      subjects.push({ name, grades, avg: Math.round(avg * 10) / 10 });
    }
  });
  return subjects;
}

async function getSchedule(sessionToken) {
  const { jar, studentId } = requireSession(sessionToken);const url = studentId ? /pupil/${studentId}/dnevnik/ : '/dnevnik/';
  const res = await jar.get(url);
  const $ = cheerio.load(res.data);
  const schedule = {};
  $('.day-block').each((_, dayBlock) => {
    const $day = $(dayBlock);
    const dayName = $day.find('.day-name').text().trim();
    if (!dayName) return;
    const lessons = [];
    $day.find('.lesson').each((_, lesson) => {
      const $l = $(lesson);
      lessons.push({
        num: parseInt($l.find('.lesson-num').text()) || null,
        subject: $l.find('.subject-name').text().trim(),
        time: $l.find('.lesson-time').text().trim(),
        homework: $l.find('.homework').text().trim() || null
      });
    });
    if (lessons.length) schedule[dayName] = lessons;
  });
  return schedule;
}

async function getHomework(sessionToken) {
  const { jar, studentId } = requireSession(sessionToken);
  const url = studentId ? /pupil/${studentId}/dnevnik/ : '/dnevnik/';
  const res = await jar.get(url);
  const $ = cheerio.load(res.data);
  const homework = [];
  $('.dz-row').each((_, el) => {
    const $el = $(el);
    const subject = $el.find('.subject-name').text().trim();
    const task = $el.find('.dz-text').text().trim();
    const date = $el.find('.date').text().trim();
    if (subject && task) homework.push({ subject, task, date, done: false });
  });
  return homework;
}

async function getTeachers(sessionToken) {
  const { jar } = requireSession(sessionToken);
  const res = await jar.get('/teachers/');
  const $ = cheerio.load(res.data);
  const teachers = [];
  $('.teacher-card').each((_, el) => {
    const $el = $(el);
    teachers.push({
      name: $el.find('.teacher-name').text().trim(),
      subject: $el.find('.subject').text().trim(),
      photo: $el.find('img').attr('src') || null
    });
  });
  return teachers;
}

module.exports = { login, getGrades, getSchedule, getHomework, getTeachers };
