 import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

const getToken = () => localStorage.getItem("nova_token");

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function App() {
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [authMode, setAuthMode] = useState("login");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "Planning",
    deadline: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "Todo",
    priority: "Medium",
    deadline: "",
    project: "",
    assignedTo: "",
  });

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);

  const [memberEmail, setMemberEmail] = useState("");

  const [search, setSearch] = useState("");

  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const token = getToken();

    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboard();
      loadProjects();
      loadTasks();
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (err) {
      localStorage.removeItem("nova_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await api.get("/projects/dashboard");
      setStats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await api.get("/tasks");
      setTasks(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshData = async () => {
    await Promise.all([
      loadDashboard(),
      loadProjects(),
      loadTasks(),
    ]);
  };

  const handleAuthChange = (e) => {
    setAuthForm({
      ...authForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const endpoint =
        authMode === "login"
          ? "/auth/login"
          : "/auth/register";

      const response = await api.post(endpoint, authForm);

      localStorage.setItem("nova_token", response.data.token);
      setUser(response.data.user);

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("nova_token");
    setUser(null);
    setProjects([]);
    setTasks([]);
    setPage("dashboard");
  };

  const openCreateProject = () => {
    setEditingProject(null);

    setProjectForm({
      name: "",
      description: "",
      status: "Planning",
      deadline: "",
    });

    setShowProjectModal(true);
  };

  const openEditProject = (project) => {
    setEditingProject(project);

    setProjectForm({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "Planning",
      deadline: project.deadline
        ? project.deadline.substring(0, 10)
        : "",
    });

    setShowProjectModal(true);
  };

  const saveProject = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (editingProject) {
        await api.put(
          `/projects/${editingProject._id}`,
          projectForm
        );
      } else {
        await api.post("/projects", projectForm);
      }

      setShowProjectModal(false);
      setEditingProject(null);

      await refreshData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save project."
      );
    }
  };

  const deleteProject = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/projects/${id}`);
      await refreshData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete project."
      );
    }
  };

  const openCreateTask = (projectId = "") => {
    setEditingTask(null);

    setTaskForm({
      title: "",
      description: "",
      status: "Todo",
      priority: "Medium",
      deadline: "",
      project: projectId,
      assignedTo: "",
    });

    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);

    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "Todo",
      priority: task.priority || "Medium",
      deadline: task.deadline
        ? task.deadline.substring(0, 10)
        : "",
      project:
        task.project?._id ||
        task.project ||
        "",
      assignedTo:
        task.assignedTo?._id ||
        task.assignedTo ||
        "",
    });

    setShowTaskModal(true);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (editingTask) {
        await api.put(
          `/tasks/${editingTask._id}`,
          taskForm
        );
      } else {
        await api.post("/tasks", taskForm);
      }

      setShowTaskModal(false);
      setEditingTask(null);

      await refreshData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save task."
      );
    }
  };

  const deleteTask = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/tasks/${id}`);
      await refreshData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete task."
      );
    }
  };

  const updateTaskStatus = async (task, status) => {
    try {
      await api.put(`/tasks/${task._id}`, {
        status,
      });

      await refreshData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update task."
      );
    }
  };

  const openProject = async (project) => {
    try {
      const response = await api.get(
        `/projects/${project._id}`
      );

      setSelectedProject(response.data);
      setPage("project");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load project."
      );
    }
  };

  const addMember = async (e) => {
    e.preventDefault();

    if (!selectedProject || !memberEmail.trim()) return;

    try {
      const response = await api.post(
        `/projects/${selectedProject.project._id}/members`,
        {
          email: memberEmail,
        }
      );

      setSelectedProject({
        ...selectedProject,
        project: response.data,
      });

      setMemberEmail("");

      await loadProjects();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add member."
      );
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) =>
      project.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [projects, search]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) =>
      task.title
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [tasks, search]);

  const getProjectProgress = (projectId) => {
    const projectTasks = tasks.filter(
      (task) =>
        task.project?._id === projectId ||
        task.project === projectId
    );

    if (projectTasks.length === 0) return 0;

    const completed = projectTasks.filter(
      (task) => task.status === "Completed"
    ).length;

    return Math.round(
      (completed / projectTasks.length) * 100
    );
  };

  const getStatusClass = (status) => {
    return status
      .toLowerCase()
      .replaceAll(" ", "-");
  };

  const formatDate = (date) => {
    if (!date) return "No deadline";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <h2>Loading NOVA...</h2>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-left">
          <div className="brand-large">
            <div className="brand-icon">N</div>
            <span>NOVA</span>
          </div>

          <div className="auth-content">
            <p className="eyebrow">
              PROJECT MANAGEMENT PLATFORM
            </p>

            <h1>
              Manage work.
              <br />
              <span>Move forward.</span>
            </h1>

            <p>
              Organize projects, manage tasks and
              collaborate with your team from one
              powerful workspace.
            </p>

            <div className="auth-features">
              <div>
                <strong>✓</strong>
                Project tracking
              </div>

              <div>
                <strong>✓</strong>
                Task management
              </div>

              <div>
                <strong>✓</strong>
                Team collaboration
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-heading">
              <h2>
                {authMode === "login"
                  ? "Welcome back"
                  : "Create your account"}
              </h2>

              <p>
                {authMode === "login"
                  ? "Sign in to continue to NOVA"
                  : "Start managing your projects today"}
              </p>
            </div>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <div className="form-group">
                  <label>Full name</label>

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your name"
                    value={authForm.name}
                    onChange={handleAuthChange}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  required
                />
              </div>

              <button
                className="primary-btn full-width"
                type="submit"
              >
                {authMode === "login"
                  ? "Sign in"
                  : "Create account"}
              </button>
            </form>

            <div className="auth-switch">
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                onClick={() => {
                  setAuthMode(
                    authMode === "login"
                      ? "register"
                      : "login"
                  );
                  setError("");
                }}
              >
                {authMode === "login"
                  ? "Create one"
                  : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">N</div>
          <span>NOVA</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={
              page === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setPage("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              page === "projects" ||
              page === "project"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setPage("projects")}
          >
            <span>▣</span>
            Projects
          </button>

          <button
            className={
              page === "tasks"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setPage("tasks")}
          >
            <span>✓</span>
            Tasks
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <button
            className="logout-btn"
            onClick={logout}
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>
              {page === "dashboard" && "Dashboard"}
              {page === "projects" && "Projects"}
              {page === "tasks" && "Tasks"}
              {page === "project" &&
                selectedProject?.project?.name}
            </h1>

            <p>
              {page === "dashboard" &&
                "Here's what's happening with your work."}

              {page === "projects" &&
                "Create and manage your projects."}

              {page === "tasks" &&
                "Track everything that needs to get done."}

              {page === "project" &&
                "Project overview and team tasks."}
            </p>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <span>⌕</span>

              <input
                placeholder="Search..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <div className="top-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {error && (
          <div className="global-error">
            <span>{error}</span>

            <button
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {page === "dashboard" && (
          <Dashboard
            stats={stats}
            projects={projects}
            tasks={tasks}
            getProjectProgress={getProjectProgress}
            formatDate={formatDate}
            openProject={openProject}
            setPage={setPage}
            openCreateProject={openCreateProject}
          />
        )}

        {page === "projects" && (
          <ProjectsPage
            projects={filteredProjects}
            tasks={tasks}
            getProjectProgress={getProjectProgress}
            formatDate={formatDate}
            openProject={openProject}
            openEditProject={openEditProject}
            deleteProject={deleteProject}
            openCreateProject={openCreateProject}
          />
        )}

        {page === "tasks" && (
          <TasksPage
            tasks={filteredTasks}
            projects={projects}
            openCreateTask={openCreateTask}
            openEditTask={openEditTask}
            deleteTask={deleteTask}
            updateTaskStatus={updateTaskStatus}
            formatDate={formatDate}
          />
        )}

        {page === "project" && selectedProject && (
          <ProjectDetails
            data={selectedProject}
            tasks={tasks}
            user={user}
            formatDate={formatDate}
            openEditProject={openEditProject}
            openCreateTask={openCreateTask}
            openEditTask={openEditTask}
            deleteTask={deleteTask}
            updateTaskStatus={updateTaskStatus}
            memberEmail={memberEmail}
            setMemberEmail={setMemberEmail}
            addMember={addMember}
          />
        )}
      </main>

      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingProject
                    ? "Edit project"
                    : "Create project"}
                </h2>

                <p>
                  Add the basic information for your
                  project.
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() =>
                  setShowProjectModal(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={saveProject}>
              <div className="form-group">
                <label>Project name</label>

                <input
                  type="text"
                  placeholder="e.g. E-commerce website"
                  value={projectForm.name}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>

                <textarea
                  placeholder="Describe your project..."
                  value={projectForm.description}
                  onChange={(e) =>
                    setProjectForm({
                      ...projectForm,
                      description:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>

                  <select
                    value={projectForm.status}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option>Planning</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Deadline</label>

                  <input
                    type="date"
                    value={projectForm.deadline}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        deadline: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setShowProjectModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editingProject
                    ? "Save changes"
                    : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingTask
                    ? "Edit task"
                    : "Create task"}
                </h2>

                <p>
                  Add task details and assign it to a
                  team member.
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() =>
                  setShowTaskModal(false)
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={saveTask}>
              <div className="form-group">
                <label>Task title</label>

                <input
                  type="text"
                  placeholder="e.g. Design homepage"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      title: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>

                <textarea
                  placeholder="Describe the task..."
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      description:
                        e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Project</label>

                  <select
                    value={taskForm.project}
                    onChange={(e) =>
                      setTaskForm({
                        ...taskForm,
                        project: e.target.value,
                        assignedTo: "",
                      })
                    }
                    required
                  >
                    <option value="">
                      Select project
                    </option>

                    {projects.map((project) => (
                      <option
                        key={project._id}
                        value={project._id}
                      >
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    value={taskForm.status}
                    onChange={(e) =>
                      setTaskForm({
                        ...taskForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option>Todo</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>

                  <select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm({
                        ...taskForm,
                        priority: e.target.value,
                      })
                    }
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Deadline</label>

                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={(e) =>
                      setTaskForm({
                        ...taskForm,
                        deadline: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Assign to</label>

                <select
                  value={taskForm.assignedTo}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      assignedTo: e.target.value,
                    })
                  }
                >
                  <option value="">
                    Unassigned
                  </option>

                  {projects
                    .find(
                      (project) =>
                        project._id ===
                        taskForm.project
                    )
                    ?.members?.map((member) => (
                      <option
                        key={member._id}
                        value={member._id}
                      >
                        {member.name} — {member.email}
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setShowTaskModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  {editingTask
                    ? "Save changes"
                    : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  stats,
  projects,
  tasks,
  getProjectProgress,
  formatDate,
  openProject,
  setPage,
  openCreateProject,
}) {
  return (
    <div className="page-content">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h2>Your workspace</h2>
        </div>

        <button
          className="primary-btn"
          onClick={openCreateProject}
        >
          + New project
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Total projects"
          value={stats.totalProjects}
          icon="▣"
        />

        <StatCard
          label="Active projects"
          value={stats.activeProjects}
          icon="◉"
        />

        <StatCard
          label="Completed tasks"
          value={stats.completedTasks}
          icon="✓"
        />

        <StatCard
          label="Pending tasks"
          value={stats.pendingTasks}
          icon="◷"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent projects</h3>
              <p>Your latest projects</p>
            </div>

            <button
              className="text-btn"
              onClick={() => setPage("projects")}
            >
              View all →
            </button>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              text="Create your first project to get started."
            />
          ) : (
            <div className="project-list">
              {projects.slice(0, 5).map((project) => (
                <div
                  className="project-row"
                  key={project._id}
                  onClick={() => openProject(project)}
                >
                  <div className="project-mark">
                    {project.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="project-main">
                    <strong>{project.name}</strong>
                    <span>
                      {project.description ||
                        "No description"}
                    </span>
                  </div>

                  <div className="project-progress">
                    <div className="progress-label">
                      <span>
                        {getProjectProgress(
                          project._id
                        )}
                        %
                      </span>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${getProjectProgress(
                            project._id
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <StatusBadge
                    status={project.status}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Upcoming tasks</h3>
              <p>Tasks that need attention</p>
            </div>

            <button
              className="text-btn"
              onClick={() => setPage("tasks")}
            >
              View all →
            </button>
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              text="Create tasks inside your projects."
            />
          ) : (
            <div className="task-list">
              {tasks.slice(0, 5).map((task) => (
                <TaskRow
                  key={task._id}
                  task={task}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ProjectsPage({
  projects,
  getProjectProgress,
  formatDate,
  openProject,
  openEditProject,
  deleteProject,
  openCreateProject,
}) {
  return (
    <div className="page-content">
      <div className="page-actions">
        <div>
          <h2>All projects</h2>
          <p>
            Manage your projects and monitor their
            progress.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={openCreateProject}
        >
          + New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="large-empty">
          <div className="empty-icon">▣</div>
          <h3>No projects found</h3>
          <p>
            Create a project to start organizing your
            work.
          </p>

          <button
            className="primary-btn"
            onClick={openCreateProject}
          >
            Create project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => {
            const progress = getProjectProgress(
              project._id
            );

            return (
              <div
                className="project-card"
                key={project._id}
              >
                <div className="project-card-top">
                  <div className="project-mark large">
                    {project.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <StatusBadge
                    status={project.status}
                  />
                </div>

                <h3>{project.name}</h3>

                <p className="project-description">
                  {project.description ||
                    "No description available."}
                </p>

                <div className="card-progress">
                  <div>
                    <span>Progress</span>
                    <strong>{progress}%</strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${progress}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="project-meta">
                  <span>
                    👥 {project.members?.length || 0}{" "}
                    members
                  </span>

                  <span>
                    ◷ {formatDate(project.deadline)}
                  </span>
                </div>

                <div className="card-actions">
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      openProject(project)
                    }
                  >
                    Open
                  </button>

                  <button
                    className="icon-btn"
                    onClick={() =>
                      openEditProject(project)
                    }
                  >
                    ✎
                  </button>

                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      deleteProject(project._id)
                    }
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TasksPage({
  tasks,
  projects,
  openCreateTask,
  openEditTask,
  deleteTask,
  updateTaskStatus,
  formatDate,
}) {
  return (
    <div className="page-content">
      <div className="page-actions">
        <div>
          <h2>All tasks</h2>
          <p>
            Track, assign and update your project
            tasks.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => openCreateTask()}
          disabled={projects.length === 0}
        >
          + New task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="large-empty">
          <div className="empty-icon">✓</div>
          <h3>No tasks found</h3>
          <p>
            Create a task to start tracking your work.
          </p>

          {projects.length > 0 && (
            <button
              className="primary-btn"
              onClick={() => openCreateTask()}
            >
              Create task
            </button>
          )}
        </div>
      ) : (
        <div className="tasks-table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Assigned to</th>
                <th>Deadline</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td>
                    <div className="table-task">
                      <strong>{task.title}</strong>

                      {task.description && (
                        <span>
                          {task.description}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    {task.project?.name ||
                      "Unknown project"}
                  </td>

                  <td>
                    <PriorityBadge
                      priority={task.priority}
                    />
                  </td>

                  <td>
                    {task.assignedTo?.name ||
                      "Unassigned"}
                  </td>

                  <td>
                    {formatDate(task.deadline)}
                  </td>

                  <td>
                    <select
                      className={`status-select ${getStatusClass(
                        task.status
                      )}`}
                      value={task.status}
                      onChange={(e) =>
                        updateTaskStatus(
                          task,
                          e.target.value
                        )
                      }
                    >
                      <option>Todo</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-btn"
                        onClick={() =>
                          openEditTask(task)
                        }
                      >
                        ✎
                      </button>

                      <button
                        className="icon-btn danger"
                        onClick={() =>
                          deleteTask(task._id)
                        }
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectDetails({
  data,
  tasks,
  user,
  formatDate,
  openEditProject,
  openCreateTask,
  openEditTask,
  deleteTask,
  updateTaskStatus,
  memberEmail,
  setMemberEmail,
  addMember,
}) {
  const project = data.project;

  const projectTasks = tasks.filter(
    (task) =>
      task.project?._id === project._id ||
      task.project === project._id
  );

  const completed = projectTasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const progress =
    projectTasks.length === 0
      ? 0
      : Math.round(
          (completed / projectTasks.length) * 100
        );

  return (
    <div className="page-content">
      <button
        className="back-btn"
        onClick={() =>
          window.history.length > 1
            ? window.history.back()
            : null
        }
      >
        ← Back
      </button>

      <div className="project-detail-header">
        <div>
          <div className="detail-title-row">
            <div className="project-mark large">
              {project.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <div className="detail-heading">
                <h2>{project.name}</h2>
                <StatusBadge
                  status={project.status}
                />
              </div>

              <p>
                {project.description ||
                  "No description available."}
              </p>
            </div>
          </div>
        </div>

        {project.owner?._id === user.id && (
          <button
            className="secondary-btn"
            onClick={() => openEditProject(project)}
          >
            ✎ Edit project
          </button>
        )}
      </div>

      <div className="detail-stats">
        <div>
          <span>Progress</span>
          <strong>{progress}%</strong>
        </div>

        <div>
          <span>Tasks</span>
          <strong>{projectTasks.length}</strong>
        </div>

        <div>
          <span>Completed</span>
          <strong>{completed}</strong>
        </div>

        <div>
          <span>Deadline</span>
          <strong>
            {formatDate(project.deadline)}
          </strong>
        </div>
      </div>

      <div className="detail-progress">
        <div className="progress-track">
          <div
            className="progress-bar"
            style={{
              width: `${progress}%`,
            }}
          ></div>
        </div>
      </div>

      <div className="project-detail-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Project tasks</h3>
              <p>
                {projectTasks.length} tasks in this
                project
              </p>
            </div>

            <button
              className="primary-btn"
              onClick={() =>
                openCreateTask(project._id)
              }
            >
              + Add task
            </button>
          </div>

          {projectTasks.length === 0 ? (
            <EmptyState
              title="No tasks"
              text="Add the first task to this project."
            />
          ) : (
            <div className="task-list">
              {projectTasks.map((task) => (
                <TaskRow
                  key={task._id}
                  task={task}
                  formatDate={formatDate}
                  detailed
                  onEdit={() => openEditTask(task)}
                  onDelete={() =>
                    deleteTask(task._id)
                  }
                  onStatusChange={(status) =>
                    updateTaskStatus(task, status)
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Team members</h3>
              <p>
                People working on this project
              </p>
            </div>
          </div>

          <div className="members-list">
            {project.members?.map((member) => (
              <div
                className="member-row"
                key={member._id}
              >
                <div className="avatar">
                  {member.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>{member.name}</strong>

                  <span>
                    {member.email}
                  </span>
                </div>

                {project.owner?._id === member._id && (
                  <span className="owner-tag">
                    Owner
                  </span>
                )}
              </div>
            ))}
          </div>

          {project.owner?._id === user.id && (
            <form
              className="add-member"
              onSubmit={addMember}
            >
              <label>Add team member</label>

              <div>
                <input
                  type="email"
                  placeholder="Member email"
                  value={memberEmail}
                  onChange={(e) =>
                    setMemberEmail(e.target.value)
                  }
                  required
                />

                <button
                  className="primary-btn"
                  type="submit"
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  formatDate,
  detailed = false,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  return (
    <div className="task-row">
      <div
        className={
          task.status === "Completed"
            ? "task-check completed"
            : "task-check"
        }
      >
        {task.status === "Completed" ? "✓" : ""}
      </div>

      <div className="task-main">
        <strong>{task.title}</strong>

        <span>
          {task.project?.name ||
            "Project"}{" "}
          {task.assignedTo?.name &&
            `• ${task.assignedTo.name}`}
        </span>
      </div>

      <PriorityBadge
        priority={task.priority}
      />

      <div className="task-date">
        {formatDate(task.deadline)}
      </div>

      {detailed && (
        <select
          className={`status-select ${getStatusClass(
            task.status
          )}`}
          value={task.status}
          onChange={(e) =>
            onStatusChange?.(e.target.value)
          }
        >
          <option>Todo</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
      )}

      {detailed && (
        <div className="table-actions">
          <button
            className="icon-btn"
            onClick={onEdit}
          >
            ✎
          </button>

          <button
            className="icon-btn danger"
            onClick={onDelete}
          >
            🗑
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`status-badge ${status
        .toLowerCase()
        .replaceAll(" ", "-")}`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span
      className={`priority-badge ${priority.toLowerCase()}`}
    >
      {priority}
    </span>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">○</div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function getStatusClass(status) {
  return status
    .toLowerCase()
    .replaceAll(" ", "-");
}

export default App;