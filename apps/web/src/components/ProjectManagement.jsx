import { useState, useEffect } from 'react';
import { ChevronDown, Trash2, Plus, Edit2, Users, Settings } from 'lucide-react';
import { useAuth } from '@/hooks';
import { apiClient } from '@/lib/apiClient';

export default function ProjectManagement() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    key: '',
    description: '',
    modules: [],
  });

  const [environmentForm, setEnvironmentForm] = useState({
    name: '',
    url: '',
    description: '',
  });

  const [customFieldForm, setCustomFieldForm] = useState({
    name: '',
    label: '',
    type: 'TEXT',
    required: false,
    options: '',
  });

  const [userAllocationForm, setUserAllocationForm] = useState({
    userId: '',
    role: 'QA_ENGINEER',
  });

  const [allUsers, setAllUsers] = useState([]);
  const [deallocatingUserId, setDeallocatingUserId] = useState(null);

  const moduleOptions = [
    'UI',
    'BACKEND',
    'API',
    'DATABASE',
    'MOBILE',
    'INTEGRATION',
    'AUTOMATION',
    'SECURITY',
    'PERFORMANCE',
    'OTHER',
  ];

  const fieldTypes = ['TEXT', 'NUMBER', 'CHECKBOX', 'SELECT', 'MULTISELECT', 'DATE', 'EMAIL'];

  const projectRoles = [
    'PROJECT_MANAGER',
    'LEAD_TESTER',
    'DEVELOPER',
    'QA_ENGINEER',
    'AUTOMATION_ENGINEER',
  ];

  // Load projects
  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    fetchProjects();
    fetchAllUsers();
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  async function fetchProjects() {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/admin/projects?take=100');
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllUsers() {
    try {
      const data = await apiClient.get('/api/admin/users?take=500');
      setAllUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function handleCreateProject() {
    if (!createForm.name || !createForm.key) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const newProject = await apiClient.post('/api/admin/projects', createForm);
      setProjects([newProject, ...projects]);
      setCreateForm({ name: '', key: '', description: '', modules: [] });
      setShowCreateModal(false);
      alert('Project created successfully');
    } catch (error) {
      console.error('Error creating project:', error);
      alert(error.message || 'Failed to create project');
    }
  }

  async function handleAddEnvironment(projectId) {
    if (!environmentForm.name) {
      alert('Environment name is required');
      return;
    }

    try {
      await apiClient.post(`/api/admin/projects/${projectId}/environments`, environmentForm);
      setEnvironmentForm({ name: '', url: '', description: '' });
      await loadProjectDetails(projectId);
      alert('Environment added successfully');
    } catch (error) {
      console.error('Error adding environment:', error);
      alert(error.message || 'Failed to add environment');
    }
  }

  async function handleAddCustomField(projectId) {
    if (!customFieldForm.name || !customFieldForm.type) {
      alert('Field name and type are required');
      return;
    }

    const fieldData = {
      ...customFieldForm,
      options: customFieldForm.options
        ? customFieldForm.options.split(',').map(o => o.trim())
        : undefined,
    };

    try {
      await apiClient.post(`/api/admin/projects/${projectId}/custom-fields`, fieldData);
      setCustomFieldForm({ name: '', label: '', type: 'TEXT', required: false, options: '' });
      await loadProjectDetails(projectId);
      alert('Custom field added successfully');
    } catch (error) {
      console.error('Error adding custom field:', error);
      alert(error.message || 'Failed to add custom field');
    }
  }

  async function handleAllocateUser(projectId) {
    if (!userAllocationForm.userId) {
      alert('Please select a user');
      return;
    }

    try {
      const result = await apiClient.post(`/api/admin/projects/${projectId}/allocate-user`, userAllocationForm);
      setUserAllocationForm({ userId: '', role: 'QA_ENGINEER' });
      await loadProjectDetails(projectId);
      
      // Get the user name from the result
      const userName = result?.user?.name || 'User';
      alert(`${userName} has been allocated to the project successfully`);
    } catch (error) {
      console.error('Error allocating user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to allocate user';
      alert(`Error: ${errorMessage}`);
    }
  }

  async function handleDeallocateUser(projectId, userId) {
    if (!confirm('Remove this user from the project?')) return;

    // Prevent double-clicks
    if (deallocatingUserId === userId) return;
    
    setDeallocatingUserId(userId);

    try {
      // Optimistically update UI
      setSelectedProject(prev =>  {
        if (!prev || prev.id !== projectId) return prev;
        return {
          ...prev,
          projectUserAllocations: prev.projectUserAllocations?.filter(
            a => a.user.id !== userId
          ) || [],
        };
      });

      await apiClient.post(`/api/admin/projects/${projectId}/deallocate-user/${userId}`, {});
      await loadProjectDetails(projectId);
      alert('User removed successfully');
    } catch (error) {
      console.error('Error deallocating user:', error);
      
      // Refresh on error to show correct state
      await loadProjectDetails(projectId);
      
      const errorMsg = error.message || 'Failed to remove user';
      // More user-friendly error message
      if (errorMsg.includes('already been removed')) {
        alert('This user has already been removed from the project');
      } else {
        alert(errorMsg);
      }
    } finally {
      setDeallocatingUserId(null);
    }
  }

  async function handleDeleteEnvironment(projectId, envId) {
    if (!confirm('Delete this environment?')) return;

    try {
      await apiClient.delete(`/api/admin/projects/${projectId}/environments/${envId}`);
      await loadProjectDetails(projectId);
      alert('Environment deleted');
    } catch (error) {
      console.error('Error deleting environment:', error);
      alert(error.message || 'Failed to delete environment');
    }
  }

  async function handleDeleteCustomField(projectId, fieldId) {
    if (!confirm('Delete this custom field?')) return;

    try {
      await apiClient.delete(`/api/admin/projects/${projectId}/custom-fields/${fieldId}`);
      await loadProjectDetails(projectId);
      alert('Custom field deleted');
    } catch (error) {
      console.error('Error deleting custom field:', error);
      alert(error.message || 'Failed to delete custom field');
    }
  }

  async function loadProjectDetails(projectId) {
    try {
      const updatedProject = await apiClient.get(`/api/admin/projects/${projectId}`);
      setSelectedProject(updatedProject);
      setProjects(prevProjects => (
        prevProjects.map(p => (p.id === projectId ? updatedProject : p))
      ));
    } catch (error) {
      console.error('Error loading project details:', error);
    }
  }

  function toggleModuleSelection(module) {
    setCreateForm(prev => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter(m => m !== module)
        : [...prev.modules, module],
    }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Project Management</h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Create and configure projects with modules, environments, and team allocations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="tt-btn tt-btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="tt-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg)]">
              <h3 className="text-xl font-bold">Create New Project</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-2xl">×</button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg"
                  placeholder="e.g., Mobile App Testing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Project Key *</label>
                <input
                  type="text"
                  value={createForm.key}
                  onChange={e => setCreateForm({ ...createForm, key: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg"
                  placeholder="e.g., MA"
                />
                <p className="text-xs text-[var(--muted)] mt-1">Unique identifier (auto-formatted to uppercase)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg h-24"
                  placeholder="Project description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Modules</label>
                <div className="grid grid-cols-2 gap-3">
                  {moduleOptions.map(module => (
                    <label key={module} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.modules.includes(module)}
                        onChange={() => toggleModuleSelection(module)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{module}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="tt-btn tt-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  className="tt-btn tt-btn-primary"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-[var(--muted)]">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="tt-card p-8 text-center text-[var(--muted)]">
            No projects yet. <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-500 hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.id ?? project.key ?? (project.name ? `${project.name}-${index}` : `project-${index}`)}
              className="tt-card rounded-lg overflow-hidden"
            >
              <div
                className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center cursor-pointer hover:bg-[var(--bg-hover)] transition"
                onClick={() => {
                  const nextExpanded = expandedProject === project.id ? null : project.id;
                  setExpandedProject(nextExpanded);
                  if (nextExpanded) {
                    setSelectedProject(project);
                    loadProjectDetails(project.id);
                  }
                }}
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{project.name}</h4>
                  <p className="text-sm text-[var(--muted)]">Key: {project.key}</p>
                  {project.description && (
                    <p className="text-sm text-[var(--muted)] mt-1">{project.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-[var(--muted)]">
                      {project._count?.projectUserAllocations || 0} users
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {project._count?.environments || 0} envs
                    </div>
                  </div>

                  <ChevronDown
                    size={20}
                    className={`transition ${expandedProject === project.id ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Project Details */}
              {expandedProject === project.id && selectedProject?.id === project.id && (
                <div className="p-6 bg-[var(--bg-elevated)] space-y-6 border-t border-[var(--border)]">
                  {/* Modules Badge */}
                  <div>
                    <h5 className="font-semibold mb-3">Modules</h5>
                    <div className="flex flex-wrap gap-2">
                      {project.modules && project.modules.length > 0 ? (
                        project.modules.map(module => (
                          <span key={module} className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-300 rounded-full text-xs font-medium">
                            {module}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[var(--muted)]">No modules assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Environments Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-semibold">Environments</h5>
                      <button
                        onClick={() => setShowConfigPanel(showConfigPanel === `env-${project.id}` ? null : `env-${project.id}`)}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {showConfigPanel === `env-${project.id}` ? 'Hide' : 'Add'}
                      </button>
                    </div>

                    {showConfigPanel === `env-${project.id}` && (
                      <div className="mb-4 p-4 bg-[var(--bg)] rounded-lg space-y-3">
                        <input
                          type="text"
                          placeholder="Environment name (e.g., Staging)"
                          value={environmentForm.name}
                          onChange={e => setEnvironmentForm({ ...environmentForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="URL (optional)"
                          value={environmentForm.url}
                          onChange={e => setEnvironmentForm({ ...environmentForm, url: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        />
                        <textarea
                          placeholder="Description (optional)"
                          value={environmentForm.description}
                          onChange={e => setEnvironmentForm({ ...environmentForm, description: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm h-20"
                        />
                        <button
                          onClick={() => handleAddEnvironment(project.id)}
                          className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Add Environment
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {selectedProject.environments && selectedProject.environments.length > 0 ? (
                        selectedProject.environments.map(env => (
                          <div key={env.id} className="flex justify-between items-start p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{env.name}</p>
                              {env.url && <p className="text-xs text-[var(--muted)]">{env.url}</p>}
                              {env.description && <p className="text-xs text-[var(--muted)]">{env.description}</p>}
                            </div>
                            <button
                              onClick={() => handleDeleteEnvironment(project.id, env.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No environments</p>
                      )}
                    </div>
                  </div>

                  {/* Custom Fields Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-semibold">Custom Fields</h5>
                      <button
                        onClick={() => setShowConfigPanel(showConfigPanel === `field-${project.id}` ? null : `field-${project.id}`)}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {showConfigPanel === `field-${project.id}` ? 'Hide' : 'Add'}
                      </button>
                    </div>

                    {showConfigPanel === `field-${project.id}` && (
                      <div className="mb-4 p-4 bg-[var(--bg)] rounded-lg space-y-3">
                        <input
                          type="text"
                          placeholder="Field name"
                          value={customFieldForm.name}
                          onChange={e => setCustomFieldForm({ ...customFieldForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Label"
                          value={customFieldForm.label}
                          onChange={e => setCustomFieldForm({ ...customFieldForm, label: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        />
                        <select
                          value={customFieldForm.type}
                          onChange={e => setCustomFieldForm({ ...customFieldForm, type: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        >
                          {fieldTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customFieldForm.required}
                            onChange={e => setCustomFieldForm({ ...customFieldForm, required: e.target.checked })}
                          />
                          <span className="text-sm">Required</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Options (comma-separated, for SELECT/MULTISELECT)"
                          value={customFieldForm.options}
                          onChange={e => setCustomFieldForm({ ...customFieldForm, options: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        />
                        <button
                          onClick={() => handleAddCustomField(project.id)}
                          className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Add Field
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {selectedProject.customFields && selectedProject.customFields.length > 0 ? (
                        selectedProject.customFields.map(field => (
                          <div key={field.id} className="flex justify-between items-start p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{field.label || field.name}</p>
                              <p className="text-xs text-[var(--muted)]">{field.type} {field.required && '(Required)'}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteCustomField(project.id, field.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No custom fields</p>
                      )}
                    </div>
                  </div>

                  {/* User Allocations Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-semibold flex items-center gap-2">
                        <Users size={18} /> Team Allocations
                      </h5>
                      <button
                        onClick={() => setShowConfigPanel(showConfigPanel === `alloc-${project.id}` ? null : `alloc-${project.id}`)}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        {showConfigPanel === `alloc-${project.id}` ? 'Hide' : 'Allocate'}
                      </button>
                    </div>

                    {showConfigPanel === `alloc-${project.id}` && (
                      <div className="mb-4 p-4 bg-[var(--bg)] rounded-lg space-y-3">
                        <select
                          value={userAllocationForm.userId}
                          onChange={e => setUserAllocationForm({ ...userAllocationForm, userId: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        >
                          <option value="">Select user...</option>
                          {allUsers.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </option>
                          ))}
                        </select>
                        <select
                          value={userAllocationForm.role}
                          onChange={e => setUserAllocationForm({ ...userAllocationForm, role: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded text-sm"
                        >
                          {projectRoles.map(role => (
                            <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAllocateUser(project.id)}
                          className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          Allocate User
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {selectedProject.projectUserAllocations && selectedProject.projectUserAllocations.length > 0 ? (
                        selectedProject.projectUserAllocations.map(allocation => (
                          <div key={allocation.user.id} className="flex justify-between items-center p-3 bg-[var(--bg)] rounded border border-[var(--border)]">
                            <div>
                              <p className="font-medium text-sm">{allocation.user.name}</p>
                              <p className="text-xs text-[var(--muted)]">{allocation.user.email} • {allocation.role.replace(/_/g, ' ')}</p>
                            </div>
                            <button
                              onClick={() => handleDeallocateUser(project.id, allocation.user.id)}
                              disabled={deallocatingUserId === allocation.user.id}
                              className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove user from project"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--muted)]">No users allocated</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
