import { FixedSizeList as List } from 'react-window';
import React from 'react';

/**
 * VirtualizedTable Component
 * Uses react-window for efficient rendering of large tables
 * Renders only visible rows to improve performance
 */
export const VirtualizedTable = React.forwardRef(
  (
    {
      columns,
      data,
      itemSize = 50,
      height = 400,
      overscanCount = 5,
      onRowClick,
      loading = false,
      emptyMessage = 'No data available',
      className = '',
    },
    ref
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center p-6 text-[var(--muted)]">
          Loading...
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center p-6 text-[var(--muted)]">
          {emptyMessage}
        </div>
      );
    }

    const Row = ({ index, style }) => {
      const item = data[index];

      return (
        <div
          style={style}
          className={`flex items-center border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors ${
            onRowClick ? 'cursor-pointer' : ''
          }`}
          onClick={() => onRowClick?.(item)}
        >
          {columns.map((column, colIndex) => (
            <div
              key={colIndex}
              className="px-4 py-2 text-sm"
              style={{ width: column.width }}
            >
              {column.render
                ? column.render(item[column.key], item)
                : item[column.key]}
            </div>
          ))}
        </div>
      );
    };

    const totalWidth = columns.reduce((sum, col) => sum + (col.width || 100), 0);

    return (
      <div className={`border border-[var(--border)] rounded-md overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center bg-[var(--surface)] border-b border-[var(--border)]">
          {columns.map((column, index) => (
            <div
              key={index}
              className="px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase"
              style={{ width: column.width }}
            >
              {column.label}
            </div>
          ))}
        </div>

        {/* Virtualized List */}
        <List
          ref={ref}
          height={height}
          itemCount={data.length}
          itemSize={itemSize}
          width="100%"
          overscanCount={overscanCount}
        >
          {Row}
        </List>
      </div>
    );
  }
);

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;
