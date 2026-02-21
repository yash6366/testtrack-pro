import { useState } from 'react';
import { useProject } from '@/hooks';
import { FolderKanban, ChevronDown } from 'lucide-react';

export default function ProjectSelector({ onProjectChange }) {
  const { projects, selectedProject, loading, setActiveProjectId } = useProject();
  const [showDropdown, setShowDropdown] = useState(false);

  function handleSelectProject(project) {
    setActiveProjectId(project.id);
    setShowDropdown(false);
    if (onProjectChange) {
      onProjectChange(project);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <FolderKanban className="w-4 h-4 text-[var(--muted)]" />
        <span className="text-sm text-[var(--muted)]">Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 py-2 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg">
        <p className="text-sm text-[var(--warning)]">No projects assigned. Contact your admin.</p>
      </div>
    );
  }

  if (projects.length === 1 && selectedProject) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg min-w-[250px]">
        <FolderKanban className="w-4 h-4 text-[var(--primary)]" />
        <div>
          <div className="text-sm font-semibold">{selectedProject.name}</div>
          <div className="text-xs text-[var(--muted)]">{selectedProject.key}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors min-w-[250px]"
      >
        <FolderKanban className="w-4 h-4 text-[var(--primary)]" />
        <div className="flex-1 text-left">
          {selectedProject ? (
            <>
              <div className="text-sm font-semibold">{selectedProject.name}</div>
              <div className="text-xs text-[var(--muted)]">{selectedProject.key}</div>
            </>
          ) : (
            <div className="text-sm text-[var(--muted)]">Select a project</div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className={`w-full px-4 py-3 text-left hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border)] last:border-b-0 ${
                  selectedProject?.id === project.id ? 'bg-[var(--primary)]/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{project.name}</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{project.key}</div>
                    {project.description && (
                      <div className="text-xs text-[var(--muted)] mt-1">{project.description}</div>
                    )}
                  </div>
                  {project.myRole && (
                    <span className="tt-pill text-xs ml-2">
                      {project.myRole.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
