import { useState, useEffect } from 'react';
import axios from 'axios';

const ExecutionTrendChart = ({ testCaseId }) => {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    if (testCaseId) {
      fetchTrendData();
    }
  }, [testCaseId, limit]);

  const fetchTrendData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/test-cases/${testCaseId}/execution-trend?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setTrendData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch execution trend');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'BLOCKED':
        return 'bg-yellow-500';
      case 'SKIPPED':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'PASSED':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      case 'BLOCKED':
        return 'text-yellow-600';
      case 'SKIPPED':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!trendData || trendData.executions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No execution history available</p>
      </div>
    );
  }

  const { executions, metrics } = trendData;

  return (
    <div className="space-y-6">
      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Runs</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalExecutions}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Pass Rate</p>
          <p className="text-2xl font-bold text-green-600">{metrics.passRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Flakiness</p>
          <p className={`text-2xl font-bold ${metrics.flakinessScore > 30 ? 'text-red-600' : metrics.flakinessScore > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
            {metrics.flakinessScore}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-blue-600">{metrics.avgDurationSeconds}s</p>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Execution Timeline</h3>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="10">Last 10</option>
            <option value="20">Last 20</option>
            <option value="50">Last 50</option>
          </select>
        </div>
        
        <div className="space-y-2">
          {executions.map((execution, _index) => (
            <div key={execution.id} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-16">{formatDate(execution.executedAt)}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className={`h-8 rounded ${getStatusColor(execution.status)}`} style={{ width: `${(execution.durationSeconds || 10) * 2}px`, maxWidth: '200px', minWidth: '40px' }}></div>
                <span className={`text-xs font-medium ${getStatusTextColor(execution.status)}`}>
                  {execution.status}
                </span>
                {execution.durationSeconds && (
                  <span className="text-xs text-gray-400">({execution.durationSeconds}s)</span>
                )}
              </div>
              <span className="text-xs text-gray-500">{execution.executor.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
        <div className="space-y-3">
          {metrics.passedCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-600">Passed</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div className="bg-green-500 h-6 rounded-full" style={{ width: `${(metrics.passedCount / metrics.totalExecutions) * 100}%` }}></div>
              </div>
              <div className="w-16 text-right text-sm font-medium text-gray-900">{metrics.passedCount}</div>
            </div>
          )}
          {metrics.failedCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-600">Failed</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div className="bg-red-500 h-6 rounded-full" style={{ width: `${(metrics.failedCount / metrics.totalExecutions) * 100}%` }}></div>
              </div>
              <div className="w-16 text-right text-sm font-medium text-gray-900">{metrics.failedCount}</div>
            </div>
          )}
          {metrics.blockedCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-600">Blocked</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div className="bg-yellow-500 h-6 rounded-full" style={{ width: `${(metrics.blockedCount / metrics.totalExecutions) * 100}%` }}></div>
              </div>
              <div className="w-16 text-right text-sm font-medium text-gray-900">{metrics.blockedCount}</div>
            </div>
          )}
          {metrics.skippedCount > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-32 text-sm text-gray-600">Skipped</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div className="bg-gray-400 h-6 rounded-full" style={{ width: `${(metrics.skippedCount / metrics.totalExecutions) * 100}%` }}></div>
              </div>
              <div className="w-16 text-right text-sm font-medium text-gray-900">{metrics.skippedCount}</div>
            </div>
          )}
        </div>
      </div>

      {/* Flakiness Warning */}
      {metrics.flakinessScore > 20 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">High Flakiness Detected</h4>
              <p className="text-sm text-yellow-700 mt-1">
                This test has a flakiness score of {metrics.flakinessScore}%, indicating inconsistent results. Consider investigating test stability.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionTrendChart;
