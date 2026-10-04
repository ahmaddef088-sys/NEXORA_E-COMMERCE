'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface Address {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine: string;
  postalCode?: string | null;
  isDefault: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Profile update state
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Address creation form state
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrCountry, setAddrCountry] = useState('US');
  const [addrCity, setAddrCity] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/account');
    }
  }, [user, authLoading, router]);

  const loadAddresses = async () => {
    try {
      const res = await fetch('/api/account/addresses');
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (user) {
      fetch('/api/account/addresses')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!ignore) {
            setAddresses(json?.data ?? []);
            setLoadingAddresses(false);
          }
        })
        .catch(() => {
          if (!ignore) setLoadingAddresses(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload: { name?: string; currentPassword?: string; newPassword?: string } = {};
      if (name.trim() && name !== user?.name) payload.name = name.trim();
      if (currentPassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        showToast('No changes to update', 'info');
        setSavingProfile(false);
        return;
      }

      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error?.message || 'Failed to update profile', 'error');
      } else {
        showToast('Profile updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        await refreshUser();
      }
    } catch {
      showToast('Network error while updating profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: addrFullName,
          phone: addrPhone,
          country: addrCountry,
          city: addrCity,
          addressLine: addrLine,
          postalCode: addrPostalCode || undefined,
          isDefault: addrIsDefault || addresses.length === 0,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error?.message || 'Failed to add address', 'error');
      } else {
        showToast('Address added!', 'success');
        setShowAddAddr(false);
        setAddrFullName('');
        setAddrPhone('');
        setAddrCity('');
        setAddrLine('');
        setAddrPostalCode('');
        setAddrIsDefault(false);
        await loadAddresses();
      }
    } catch {
      showToast('Network error while creating address', 'error');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/account/addresses/${id}/default`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('Default address updated', 'success');
        await loadAddresses();
      } else {
        showToast('Failed to update default address', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Address removed', 'info');
        await loadAddresses();
      } else {
        showToast('Failed to remove address', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    }
  };

  if (authLoading || !user) {
    return <div className="container" style={{ paddingBlock: 'var(--space-12)' }}>Loading account...</div>;
  }

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-10)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <div>
          <h1 className="heading-section">Customer Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.name}</p>
        </div>
        <Link href="/orders" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>View My Orders</span>
        </Link>
      </div>

      <div className="grid-2col" style={{ alignItems: 'start' }}>
        {/* Profile Settings */}
        <div className="card">
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            Profile Details
          </h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="input-group">
              <label className="input-label">Email Address (Read-only)</label>
              <input type="email" disabled value={user.email} className="input-field" />
            </div>

            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                required
                value={name || user.name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>

            <div
              style={{
                marginTop: 'var(--space-6)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                Change Password
              </h3>
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter current password"
                />
              </div>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary"
              style={{ marginTop: 'var(--space-4)' }}
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Shipping Addresses Manager */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-4)',
            }}
          >
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
              Saved Addresses
            </h2>
            <button
              type="button"
              onClick={() => setShowAddAddr(!showAddAddr)}
              className="btn btn-secondary btn-sm"
            >
              {showAddAddr ? 'Cancel' : '+ Add Address'}
            </button>
          </div>

          {/* Add Address Form Modal / Accordion */}
          {showAddAddr && (
            <form
              onSubmit={handleCreateAddress}
              style={{
                marginBottom: 'var(--space-6)',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                New Shipping Address
              </h3>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addrFullName}
                  onChange={(e) => setAddrFullName(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-label">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Country *</label>
                  <input
                    type="text"
                    required
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Address Line *</label>
                <input
                  type="text"
                  required
                  value={addrLine}
                  onChange={(e) => setAddrLine(e.target.value)}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-label">City *</label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Postal Code</label>
                  <input
                    type="text"
                    value={addrPostalCode}
                    onChange={(e) => setAddrPostalCode(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                <input
                  type="checkbox"
                  id="defaultCheck"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                />
                <label htmlFor="defaultCheck" style={{ fontSize: 'var(--font-size-sm)' }}>
                  Set as default shipping address
                </label>
              </div>
              <button type="submit" disabled={savingAddr} className="btn btn-primary btn-sm">
                {savingAddr ? 'Saving...' : 'Save Address'}
              </button>
            </form>
          )}

          {/* List of saved addresses */}
          {loadingAddresses ? (
            <div className="skeleton" style={{ height: '140px' }} />
          ) : addresses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontSize: 'var(--font-size-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontWeight: 600 }}>{addr.fullName}</span>
                      {addr.isDefault && <span className="badge badge-success">Default</span>}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {addr.addressLine}, {addr.city}, {addr.country} {addr.postalCode}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      Phone: {addr.phone}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Make Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No addresses saved yet. Add an address to speed up checkout.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
