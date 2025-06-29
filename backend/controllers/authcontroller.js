const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const test = (req, res) => {
    res.json('test is working');
};

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username) {
            return res.status(400).json({
                error: "username is required"
            });
        }
        
        if (!password || password.length < 8) {
            return res.status(400).json({
                error: "password is required and should be greater than 8 characters"
            });
        }

        const exist = await User.findOne({ email });
        if (exist) {
            return res.status(400).json({
                error: "email is already taken"
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username, 
            email, 
            passwordHash: hashedPassword 
        });
        
        return res.status(201).json({
            message: "User created successfully",
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Server error during registration"
        });
    }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        error: "No user found with this email"
      });
    }
    
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({
        error: "Incorrect password"
      });
    }
    
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        username: user.username 
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: "Login failed. Please try again."
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
    test,
    registerUser,
    loginUser,
    getProfile
};