'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Lead {
  id: string;
  business_name: string;
  owner_name?: string;
  business_type?: string;
  email?: string;
  phone?: string;
  city?: string;
  deal_value?: number;
  stage: string;
  follow_up_date?: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

const STAGES = ['new', 'contacted', 'proposal', 'negotiating', 'won', 'lost'];
const STAGE_LABELS = {
  new: '📩 New Leads',
  contacted: '📞 Contacted',
  proposal: '📋 Proposal Sent',
  negotiating: '💬 Negotiating',
  won: '🎉 Won',
  lost: '❌ Lost',
};

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pipeline_value: 0,
    avg_deal_size: 0,
    conversion_rate: 0,
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/crm/leads');
      const data = await res.json();
      setLeads(data.leads || []);
      calculateStats(data.leads || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leads: Lead[]) => {
    const total = leads.length;
    const pipeline = leads.filter((l) => !['won', 'lost'].includes(l.stage));
    const won = leads.filter((l) => l.stage === 'won');

    const totalValue = pipeline.reduce((sum, l) => sum + (l.deal_value || 0), 0);
    const avgSize = pipeline.length > 0 ? totalValue / pipeline.length : 0;
    const convRate = total > 0 ? (won.length / total) * 100 : 0;

    setStats({
      total,
      pipeline_value: totalValue,
      avg_deal_size: avgSize,
      conversion_rate: convRate,
    });
  };

  const updateLeadStage = async (leadId: string, newStage: string) => {
    try {
      await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      fetchLeads();
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedLead) {
      updateLeadStage(draggedLead.id, stage);
      setDraggedLead(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0b09', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c8a96e', fontSize: 14 }}>Loading leads...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b09', color: '#e8e2d8', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background: 'rgba(11,11,9,0.85)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 40,
          paddingRight: 40,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#c8a96e' }}>Sitecraft</div>
        </Link>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'rgba(232,226,216,0.6)', textDecoration: 'none' }}>
            Projects
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ fontSize: 13, color: '#c8a96e', fontWeight: 600 }}>Sales Pipeline</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ paddingTop: 80, padding: '80px 40px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 60 }}>
          <div
            style={{
              background: 'rgba(200,169,110,0.08)',
              border: '1px solid rgba(200,169,110,0.2)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Total Leads
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: 12, color: 'rgba(232,226,216,0.5)', marginTop: 8 }}>All time</div>
          </div>

          <div
            style={{
              background: 'rgba(200,169,110,0.08)',
              border: '1px solid rgba(200,169,110,0.2)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Pipeline Value
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>${(stats.pipeline_value / 1000).toFixed(1)}k</div>
            <div style={{ fontSize: 12, color: 'rgba(232,226,216,0.5)', marginTop: 8 }}>In active deals</div>
          </div>

          <div
            style={{
              background: 'rgba(200,169,110,0.08)',
              border: '1px solid rgba(200,169,110,0.2)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Avg Deal Size
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>${Math.round(stats.avg_deal_size)}</div>
            <div style={{ fontSize: 12, color: 'rgba(232,226,216,0.5)', marginTop: 8 }}>Per opportunity</div>
          </div>

          <div
            style={{
              background: 'rgba(200,169,110,0.08)',
              border: '1px solid rgba(200,169,110,0.2)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Conversion Rate
            </div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{stats.conversion_rate.toFixed(1)}%</div>
            <div style={{ fontSize: 12, color: 'rgba(232,226,216,0.5)', marginTop: 8 }}>Closed / Total</div>
          </div>
        </div>

        {/* Kanban Board */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, gap: 20 }}>
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);

            return (
              <div
                key={stage}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(stage, e)}
                style={{
                  background: draggedLead?.stage === stage ? 'rgba(200,169,110,0.15)' : 'rgba(17,17,16,0.4)',
                  border: draggedLead?.stage === stage ? '2px dashed #c8a96e' : '1px solid rgba(200,169,110,0.1)',
                  borderRadius: 12,
                  padding: 16,
                  minHeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                    {STAGE_LABELS[stage as keyof typeof STAGE_LABELS]}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(232,226,216,0.5)' }}>
                    {stageLeads.length} lead{stageLeads.length !== 1 ? 's' : ''}
                  </div>
                  {stageValue > 0 && (
                    <div style={{ fontSize: 11, color: '#c8a96e', marginTop: 4 }}>${stageValue.toLocaleString()}</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      style={{
                        background: 'rgba(30,30,24,0.8)',
                        border: '1px solid rgba(200,169,110,0.15)',
                        borderRadius: 8,
                        padding: 12,
                        cursor: 'grab',
                        transition: 'all 0.2s',
                        opacity: draggedLead?.id === lead.id ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,169,110,0.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,169,110,0.15)';
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#e8e2d8' }}>
                        {lead.business_name}
                      </div>
                      {lead.owner_name && (
                        <div style={{ fontSize: 12, color: 'rgba(232,226,216,0.6)', marginBottom: 6 }}>
                          👤 {lead.owner_name}
                        </div>
                      )}
                      {lead.deal_value && (
                        <div style={{ fontSize: 12, color: '#c8a96e', fontWeight: 600, marginBottom: 6 }}>
                          ${lead.deal_value.toLocaleString()}
                        </div>
                      )}
                      {lead.follow_up_date && (
                        <div style={{ fontSize: 11, color: 'rgba(232,226,216,0.4)' }}>
                          ⏰ {new Date(lead.follow_up_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div style={{ fontSize: 12, color: 'rgba(232,226,216,0.2)', textAlign: 'center', paddingTop: 100, opacity: 0.5 }}>
                      Drag leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
