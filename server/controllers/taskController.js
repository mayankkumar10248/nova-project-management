const Task = require("../models/Task");
const Project = require("../models/Project");

// Create task
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      deadline,
      project,
      assignedTo,
    } = req.body;

    if (!title || !project) {
      return res.status(400).json({
        message: "Title and project are required",
      });
    }

    const projectData = await Project.findById(project);

    if (!projectData) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember =
      projectData.owner.toString() === req.user.id ||
      projectData.members.some(
        (member) => member.toString() === req.user.id
      );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    if (
      assignedTo &&
      !projectData.members.some(
        (member) => member.toString() === assignedTo
      )
    ) {
      return res.status(400).json({
        message: "Assigned user must be a project member",
      });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      deadline,
      project,
      assignedTo: assignedTo || null,
      createdBy: req.user.id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Get tasks
const getTasks = async (req, res) => {
  try {
    const { project } = req.query;

    let filter = {};

    if (project) {
      const projectData = await Project.findById(project);

      if (!projectData) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      const isMember =
        projectData.owner.toString() === req.user.id ||
        projectData.members.some(
          (member) => member.toString() === req.user.id
        );

      if (!isMember) {
        return res.status(403).json({
          message: "Access denied",
        });
      }

      filter.project = project;
    } else {
      const projects = await Project.find({
        $or: [
          { owner: req.user.id },
          { members: req.user.id },
        ],
      }).select("_id");

      filter.project = {
        $in: projects.map((item) => item._id),
      };
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("project", "name")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember =
      project.owner.toString() === req.user.id ||
      project.members.some(
        (member) => member.toString() === req.user.id
      );

    if (!isMember) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const {
      title,
      description,
      status,
      priority,
      deadline,
      assignedTo,
    } = req.body;

    if (
      assignedTo &&
      !project.members.some(
        (member) => member.toString() === assignedTo
      )
    ) {
      return res.status(400).json({
        message: "Assigned user must be a project member",
      });
    }

    task.title = title ?? task.title;
    task.description = description ?? task.description;
    task.status = status ?? task.status;
    task.priority = priority ?? task.priority;
    task.deadline = deadline ?? task.deadline;

    if (assignedTo !== undefined) {
      task.assignedTo = assignedTo || null;
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .populate("project", "name");

    res.json(updatedTask);
  } catch (error) {
    console.error("Update task error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember =
      project.owner.toString() === req.user.id ||
      project.members.some(
        (member) => member.toString() === req.user.id
      );

    if (!isMember) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    await task.deleteOne();

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
};