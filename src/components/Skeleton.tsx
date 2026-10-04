
export function ProductSkeleton() {
  return (
    <div className="card" style={{ padding: 'var(--space-5)', height: '360px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div className="skeleton" style={{ height: '20px', width: '35%', marginBottom: 'var(--space-3)' }} />
        <div className="skeleton" style={{ height: '180px', width: '100%', marginBottom: 'var(--space-4)' }} />
        <div className="skeleton" style={{ height: '20px', width: '85%', marginBottom: 'var(--space-2)' }} />
        <div className="skeleton" style={{ height: '14px', width: '45%' }} />
      </div>
      <div>
        <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: 'var(--space-4)' }} />
        <div className="skeleton" style={{ height: '40px', width: '100%' }} />
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="card" style={{ padding: 'var(--space-6)', height: '140px' }}>
      <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: 'var(--space-3)' }} />
      <div className="skeleton" style={{ height: '16px', width: '90%', marginBottom: 'var(--space-2)' }} />
      <div className="skeleton" style={{ height: '16px', width: '40%' }} />
    </div>
  );
}
