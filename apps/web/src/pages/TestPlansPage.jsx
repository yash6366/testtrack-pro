import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import { logError } from '../lib/errorLogger';

export default function TestPlansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [testPlans, setTestPlans] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [draggedCase, setDraggedCase] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  const projectId = searchParams.get('projectId') || localStorage.getItem('selectedProjectId');

  useEffect(() => {
    loadTestPlans();
  }, [projectId]);

  const loadTestPlans = async () => {
    if (!projectId) {
      setError('No project selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(`/api/projects/${projectId}/test-plans`);
      setTestPlans(response.data || response || []);
    } catch (err) {
      setError(err.message || 'Failed to load test plans');
      logError(err, 'TestPlansPage.loadTestPlans');
    } finally {
      setLoading(false);
    }
  };

  const loadTestCasesForPlan = async (planId) => {
    try {
      const response = await apiClient.get(`/api/projects/${projectId}/test-plans/${planId}/test-cases`);
      setTestCases(response.data || response || []);
      setSelectedPlan(planId);
      setShowPlanDetails(true);
    } catch (err) {
      setError(err.message || 'Failed to load test cases');
      logError(err, 'TestPlansPage.loadTestCasesForPlan');
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) {
      setError('Please enter a test plan name');
      return;
    }

    try {
      const response = await apiClient.post(`/api/projects/${projectId}/test-plans`, {
        name: newPlanName,
        description: '',
      });
      setTestPlans([...testPlans, response.data || response]);
      setNewPlanName('');
      setShowCreateModal(false);
    } catch (err) {
      setError(err.message || 'Failed to create test plan');
      logError(err, 'TestPlansPage.createPlan');
    }
  };

  const handleDragStart = (testCase) => {
    setDraggedCase(testCase);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900');
  };

  const handleDrop = async (e, planId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900');

    if (!draggedCase) return;

    try {
      // Add test case to plan
      await apiClient.post(
        `/api/projects/${projectId}/test-plans/${planId}/test-cases`,
        { testCaseId: draggedCase.id }
      );

      // Reload test cases for the plan
      if (selectedPlan === planId) {
        await loadTestCasesForPlan(planId);
      }
      setDraggedCase(null);
    } catch (err) {
      setError(err.message || 'Failed to add test case to plan');
      logError(err, 'TestPlansPage.addTestCaseToPlan');
    }
  };

  const handleRemoveTestCase = async (testCaseId, planId) => {
    try {
      await apiClient.delete(
        `/api/projects/${projectId}/test-plans/${planId}/test-cases/${testCaseId}`
      );
      // Reload test cases for the plan
      if (selectedPlan === planId) {
        await loadTestCasesForPlan(planId);
      }
    } catch (err) {
      setError(err.message || 'Failed to remove test case');
      console.error(err);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this test plan?')) return;

    try {
      await apiClient.delete(`/api/projects/${projectId}/test-plans/${planId}`);
      setTestPlans(testPlans.filter(p => p.id !== planId));
      if (selectedPlan === planId) {
        setSelectedPlan(null);
        setShowPlanDetails(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete test plan');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--border)] border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Test Plans</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            + Create Plan
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--card-bg)] rounded-lg p-6 w-96 shadow-lg">
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Create Test Plan</h2>
              <input
                type="text"
                placeholder="Test Plan Name"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="w-full px-3 py-2 mb-4 bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePlan}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPlanName('');
                  }}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-6">
          {/* Test Plans List */}
          <div className="col-span-1 border border-[var(--border)] rounded-lg p-4 bg-[var(--card-bg)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Plans</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testPlans.length === 0 ? (
                <p className="text-[var(--muted-foreground)] text-sm">No test plans created yet</p>
              ) : (
                testPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedPlan === plan.id
                        ? 'bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-600'
                        : 'bg-[var(--hover-bg)] hover:bg-[var(--input-bg)]'
                    }`}
                    onClick={() => loadTestCasesForPlan(plan.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--foreground)]">{plan.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {plan.testCasesCount || 0} test cases
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(plan.id);
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Cases Workspace */}
          <div className="col-span-3">
            {showPlanDetails && selectedPlan ? (
              <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card-bg)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
                  Test Cases in Plan
                </h2>
                
                {/* Drag-and-drop area for adding test cases */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, selectedPlan)}
                  className="mb-4 p-4 border-2 border-dashed border-[var(--border)] rounded-lg text-center text-[var(--muted-foreground)] transition bg-[var(--hover-bg)]"
                >
                  Drag test cases here to add them
                </div>

                {/* Test cases list */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testCases.length === 0 ? (
                    <p className="text-[var(--muted-foreground)] text-sm">
                      No test cases in this plan
                    </p>
                  ) : (
                    testCases.map((testCase) => (
                      <div
                        key={testCase.id}
                        className="p-3 bg-[var(--hover-bg)] rounded-lg flex justify-between items-start hover:bg-[var(--input-bg)] transition"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-[var(--foreground)]">{testCase.title}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            Type: {testCase.type} | Priority: {testCase.priority}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveTestCase(testCase.id, selectedPlan)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-[var(--border)] rounded-lg p-8 bg-[var(--card-bg)] text-center">
                <p className="text-[var(--muted-foreground)]">Select a test plan to view and manage its test cases</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Test Cases for Dragging */}
        <div className="mt-6 border border-[var(--border)] rounded-lg p-4 bg-[var(--card-bg)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Available Test Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testCases.length === 0 ? (
              <p className="text-[var(--muted-foreground)] col-span-full text-sm">
                No test cases available
              </p>
            ) : (
              testCases
                .slice(0, 9) // Show first 9 for preview
                .map((testCase) => (
                  <div
                    key={testCase.id}
                    draggable
                    onDragStart={() => handleDragStart(testCase)}
                    className="p-3 bg-[var(--hover-bg)] rounded-lg cursor-move hover:shadow-md transition border border-[var(--border)]"
                  >
                    <p className="font-semibold text-[var(--foreground)] text-sm">{testCase.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      {testCase.type} • {testCase.priority}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
