const { User, Role, Employee, Department, Designation } = require('../models');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');
const { generateToken } = require('../utils/jwt');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user
    const user = await User.findOne({
      where: { username },
      include: [
        { model: Role, as: 'role' },
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' },
            { model: Designation, as: 'designation' }
          ]
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.role.name,
    });

    // Return user data and token
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        departmentId: user.departmentId,
        active: user.active,
        employee: user.employee,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

const register = async (req, res) => {
  try {
    const { username, email, password, roleId, departmentId } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      where: { [require('sequelize').Op.or]: [{ username }, { email }] },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId: roleId || 4, // Default to EMPLOYEE
      departmentId,
      active: true,
    });

    try {
      const nameParts = username.trim().split(/[\s._-]+/);
      const firstName = nameParts[0] ? (nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)) : 'Employee';
      const lastName = nameParts[1] ? (nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)) : 'User';

      await Employee.create({
        userId: user.id,
        firstName,
        lastName,
        email,
        departmentId: departmentId || null,
        status: 'Active',
        joinDate: new Date(),
      });
    } catch (empError) {
      await user.destroy();
      throw empError;
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

const logout = (req, res) => {
  // Token invalidation would typically be done on client-side
  // or using a token blacklist on server-side
  res.json({ message: 'Logged out successfully' });
};

const nodemailer = require('nodemailer');

const forgotPassword = async (req, res) => {
  try {
    const { username, email, employeeId } = req.body;

    if (!username || !email || !employeeId) {
      return res.status(400).json({ error: 'Username, Email, and Employee ID are required' });
    }

    // Find the user with username and email
    const user = await User.findOne({
      where: { username, email },
      include: [{ model: Employee, as: 'employee' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'No matching user found with the provided username and email' });
    }

    // Verify if the associated Employee ID matches
    if (!user.employee || user.employee.id !== parseInt(employeeId)) {
      return res.status(400).json({ error: 'Incorrect Employee ID for this user account' });
    }

    // Generate a temporary new password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await hashPassword(tempPassword);

    // Update user's password in database
    await user.update({ password: hashedPassword });

    // Setup Nodemailer transporter from environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'placeholder@gmail.com',
        pass: process.env.SMTP_PASS || 'placeholderpassword'
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER || 'placeholder@gmail.com',
      to: email,
      subject: 'HBEONLABS Password Reset request',
      text: `Hello ${user.employee.firstName},\n\nYour HBEONLABS account password has been successfully reset.\n\nHere are your new temporary credentials:\n• Username: ${username}\n• Employee ID: #${employeeId}\n• Temporary Password: ${tempPassword}\n\nPlease log in and update your password under your Profile Settings as soon as possible.\n\nBest regards,\nHBEONLABS IT Support`
    };

    let emailSent = false;
    let emailError = null;

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await transporter.sendMail(mailOptions);
        emailSent = true;
      } else {
        emailError = 'SMTP credentials not configured in .env';
      }
    } catch (mailErr) {
      console.error('Failed to send password reset email via Nodemailer:', mailErr);
      emailError = mailErr.message;
    }

    // Log the credentials in the server console for local testing/development
    console.log('\n=============================================');
    console.log('PASSWORD RESET EVENT LOG');
    console.log(`User: ${username} (Employee ID: #${employeeId})`);
    console.log(`Email: ${email}`);
    console.log(`New Temporary Password: ${tempPassword}`);
    console.log(`Email Send Status: ${emailSent ? 'SUCCESS' : `FAILED (${emailError})`}`);
    console.log('=============================================\n');

    res.json({
      message: 'Password reset successful.',
      emailSent,
      details: emailSent ? 'Temporary password has been sent to your email.' : 'Temporary password printed to server logs. Configure SMTP in .env to dispatch emails.'
    });

  } catch (error) {
    res.status(500).json({ error: 'Password reset failed', details: error.message });
  }
};

module.exports = {
  login,
  register,
  logout,
  forgotPassword,
};
