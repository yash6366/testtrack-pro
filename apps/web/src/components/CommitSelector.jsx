import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

/**
 * CommitSelector Component
 * Allows manual selection and linking of commits/PRs to bugs from bug details page
 */
export default function CommitSelector({ projectId, bugId, onCommitSelected, onClose }) {
  const [commits, setCommits] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('commits'); // 'commits' or 'prs'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [filter, setFilter] = useState('all'); // 'linked', 'unlinked', 'all'

  useEffect(() => {
    loadCommitsAndPRs();
  }, [projectId]);

  const loadCommitsAndPRs = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch commits
      const commitsResponse = await apiClient.get(
        `/api/projects/${projectId}/github-integration/commits?limit=100`
      );
      setCommits(commitsResponse || []);

      // In a real implementation, you'd fetch PRs too
      // For now, we'll just use commits
      setPullRequests([]);
    } catch (err) {
      setError(err.message || 'Failed to load commits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (itemId, type = 'commit') => {
    const key = `${type}-${itemId}`;
    setSelectedItems((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key]
    );
  };

  const handleLinkCommits = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one commit or PR');
      return;
    }

    try {
      // Extract commit IDs and PR IDs from selectedItems
      const commitIds = selectedItems
        .filter((s) => s.startsWith('commit-'))
        .map((s) => parseInt(s.split('-')[1]));

      const prIds = selectedItems
        .filter((s) => s.startsWith('pr-'))
        .map((s) => parseInt(s.split('-')[1]));

      // In a real implementation, you would send these to the API
      if (onCommitSelected) {
        onCommitSelected({
          commitIds,
          prIds,
          selectedItems,
        });
      }

      // Reset and close
      setSelectedItems([]);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to link commits');
      console.error(err);
    }
  };

  const filteredCommits = commits.filter((commit) => {
    // Filter by search term
    if (
      searchTerm &&
      !commit.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !commit.commitHash.includes(searchTerm)
    ) {
      return false;
    }

    // Filter by linked status
    if (filter === 'linked') {
      return commit.autoLinkedDefectId === bugId || commit.linkedBugIds?.includes(bugId);
    } else if (filter === 'unlinked') {
      return !(commit.autoLinkedDefectId === bugId || commit.linkedBugIds?.includes(bugId));
    }

    return true;
  });

  const filteredPRs = pullRequests.filter((pr) => {
    if (
      searchTerm &&
      !pr.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !pr.prNumber.toString().includes(searchTerm)
    ) {
      return false;
    }

    if (filter === 'linked') {
      return pr.linkedBugIds?.includes(bugId);
    } else if (filter === 'unlinked') {
      return !pr.linkedBugIds?.includes(bugId);
    }

    return true;
  });

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-[var(--border)] border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] rounded-lg p-6 w-3/4 h-3/4 max-w-4xl shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Link Commits & PRs</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-[var(--border)]">
          <button
            onClick={() => {
              setSelectedTab('commits');
              setSearchTerm('');
            }}
            className={`px-4 py-2 font-semibold transition ${
              selectedTab === 'commits'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Commits ({filteredCommits.length})
          </button>
          <button
            onClick={() => {
              setSelectedTab('prs');
              setSearchTerm('');
            }}
            className={`px-4 py-2 font-semibold transition ${
              selectedTab === 'prs'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Pull Requests ({filteredPRs.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder={selectedTab === 'commits' ? 'Search commits by hash or message...' : 'Search PRs by number or title...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="linked">Linked to Bug</option>
            <option value="unlinked">Not Linked</option>
          </select>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded-lg bg-[var(--hover-bg)] mb-4">
          {selectedTab === 'commits' ? (
            // Commits List
            filteredCommits.length === 0 ? (
              <div className="p-4 text-center text-[var(--muted-foreground)]">
                No commits found
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredCommits.map((commit) => {
                  const isSelected = selectedItems.includes(`commit-${commit.id}`);
                  const isAutoLinked = commit.autoLinkedDefectId === bugId;
                  const isManuallyLinked = commit.linkedBugIds?.includes(bugId);

                  return (
                    <div
                      key={commit.id}
                      className={`p-4 cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900'
                          : 'hover:bg-[var(--input-bg)]'
                      }`}
                      onClick={() => handleSelectItem(commit.id, 'commit')}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-mono text-xs text-blue-600 dark:text-blue-400">
                              {commit.commitHash?.substring(0, 7)}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {new Date(commit.committedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-[var(--foreground)] mb-1">
                            {commit.message.split('\n')[0]}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-[var(--muted-foreground)]">
                              by {commit.authorName}
                            </p>
                            {isAutoLinked && (
                              <span className="inline-block px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                                Auto-linked
                              </span>
                            )}
                            {isManuallyLinked && (
                              <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                Manually linked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // PRs List
            filteredPRs.length === 0 ? (
              <div className="p-4 text-center text-[var(--muted-foreground)]">
                No pull requests found
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredPRs.map((pr) => {
                  const isSelected = selectedItems.includes(`pr-${pr.id}`);
                  const isLinked = pr.linkedBugIds?.includes(bugId);

                  return (
                    <div
                      key={pr.id}
                      className={`p-4 cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900'
                          : 'hover:bg-[var(--input-bg)]'
                      }`}
                      onClick={() => handleSelectItem(pr.id, 'pr')}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-[var(--foreground)]">
                              PR #{pr.prNumber}
                            </p>
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded font-semibold ${
                                pr.status === 'MERGED'
                                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                  : pr.status === 'CLOSED'
                                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                  : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              }`}
                            >
                              {pr.status}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--foreground)] mb-1">{pr.title}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-[var(--muted-foreground)]">
                              by {pr.authorName}
                            </p>
                            {isLinked && (
                              <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                Already linked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {selectedItems.length} item(s) selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--input-bg)] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleLinkCommits}
              disabled={selectedItems.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Link Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
