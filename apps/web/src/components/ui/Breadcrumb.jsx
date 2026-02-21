import { Link } from 'react-router-dom';

export function Breadcrumb({ crumbs = [] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`}>
          {index > 0 && <span className="separator">›</span>}
          {crumb.path ? (
            <Link to={crumb.path}>{crumb.label}</Link>
          ) : (
            <span className="current">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumb;
