const express = require('express');
const router = express.Router();
const scraper = require('../scraper/schoolsScraper');

function auth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Нет токена. Войдите заново.' });
  req.sessionToken = token;
  next();
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Нужны username и password' });
  try {
    const result = await scraper.login(username, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/grades', auth, async (req, res) => {
  try {
    const grades = await scraper.getGrades(req.sessionToken);
    res.json(grades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedule', auth, async (req, res) => {
  try {
    const schedule = await scraper.getSchedule(req.sessionToken);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/homework', auth, async (req, res) => {
  try {
    const hw = await scraper.getHomework(req.sessionToken);
    res.json(hw);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/teachers', auth, async (req, res) => {
  try {
    const teachers = await scraper.getTeachers(req.sessionToken);
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', auth, (req, res) => res.json({ ok: true }));

module.exports = router;
