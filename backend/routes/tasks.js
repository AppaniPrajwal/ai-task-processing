const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create a task
router.post('/', auth, async (req, res) => {
  try {
    const { title, inputText, operation } = req.body;

    const newTask = new Task({
      userId: req.user.id,
      title,
      inputText,
      operation,
      status: 'pending',
    });

    const task = await newTask.save();

    // Push job to Redis queue
    const jobData = {
      taskId: task._id.toString(),
      inputText: task.inputText,
      operation: task.operation,
    };
    
    console.log(`[Backend] Pushing task ${task._id} to Redis queue...`);
    await redis.lpush('task_queue', JSON.stringify(jobData));
    console.log(`[Backend] Successfully queued task ${task._id}`);

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all tasks for user
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a specific task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ msg: 'Task not found' });
    }

    if (task.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    res.json(task);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Task not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;
