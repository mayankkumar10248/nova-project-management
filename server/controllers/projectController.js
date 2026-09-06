const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task");

// Get all projects for logged-in user
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { members: req.user.id },
      ],
    })
      .populate("owner", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get single project
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember =
      project.owner._id.toString() === req.user.id ||
      project.members.some(
        (member) => member._id.toString() === req.user.id
      );

    if (!isMember) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const tasks = await Task.find({
      project: project._id,
    })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json({
      project,
      tasks,
    });
  } catch (error) {
    console.error("Get project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Create project
const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      deadline,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    const project = await Project.create({
      name,
      description,
      status,
      deadline,
      owner: req.user.id,
      members: [req.user.id],
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    res.status(201).json(populatedProject);
  } catch (error) {
    console.error("Create project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the project owner can update this project",
      });
    }

    const {
      name,
      description,
      status,
      deadline,
    } = req.body;

    project.name = name ?? project.name;
    project.description = description ?? project.description;
    project.status = status ?? project.status;
    project.deadline = deadline ?? project.deadline;

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    res.json(updatedProject);
  } catch (error) {
    console.error("Update project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the project owner can delete this project",
      });
    }

    await Task.deleteMany({
      project: project._id,
    });

    await project.deleteOne();

    res.json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Add member
const addMember = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Member email is required",
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only the project owner can add members",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "No registered user found with this email",
      });
    }

    if (project.members.includes(user._id)) {
      return res.status(400).json({
        message: "User is already a project member",
      });
    }

    project.members.push(user._id);

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("members", "name email");

    res.json(updatedProject);
  } catch (error) {
    console.error("Add member error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { members: req.user.id },
      ],
    });

    const projectIds = projects.map((project) => project._id);

    const tasks = await Task.find({
      project: { $in: projectIds },
    });

    const completedTasks = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    const pendingTasks = tasks.filter(
      (task) => task.status !== "Completed"
    ).length;

    res.json({
      totalProjects: projects.length,
      activeProjects: projects.filter(
        (project) => project.status !== "Completed"
      ).length,
      completedProjects: projects.filter(
        (project) => project.status === "Completed"
      ).length,
      totalTasks: tasks.length,
      completedTasks,
      pendingTasks,
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  getDashboardStats,
};