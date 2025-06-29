require('dotenv').config(); // Load .env variables
const mongoose = require('mongoose');
const Problem = require('./models/Problem');

mongoose.connect(process.env.MONGO_URL).then(async () => {
  await Problem.deleteMany({}); // Clear existing problems (optional)
  await Problem.insertMany([
    {
      title: 'Sum of Two Numbers',
      description: 'Write a function that returns the sum of two numbers.',
      difficulty: 'Easy',
      testCases: [
        { input: '1\n2', output: '3' },
        { input: '5\n7', output: '12' },
      ],
    },
    {
      title: 'Reverse String',
      description: 'Write a function that reverses a string.',
      difficulty: 'Medium',
      testCases: [
        { input: 'hello', output: 'olleh' },
        { input: 'world', output: 'dlrow' },
      ],
    },
  ]);
  console.log('Problems seeded');
  mongoose.disconnect();
}).catch(err => {
  console.error('Seeding failed:', err);
  mongoose.disconnect();
});