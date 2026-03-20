import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { LoadingOverlay } from '../ui/Spinner';
import { api } from '../../services/api/client';
import { useToast } from '../ui/Toast';
import type { AccessPolicy, PolicyCondition } from '@shared/api/contracts';

export function PolicyEditor() {
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { showToast } = useToast();

  // New policy form state
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    effect: 'allow' as 'allow' | 'deny',
    resource: '',
    conditions: [] as PolicyCondition[],
    priority: 0,
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    try {
      const { policies } = await api.get<{ policies: AccessPolicy[] }>('/policies');
      setPolicies(policies);
    } catch {
      showToast('error', 'Kan beleid niet laden');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const policy = await api.post<AccessPolicy>('/policies', newPolicy);
      setPolicies(prev => [...prev, policy]);
      setShowCreate(false);
      setNewPolicy({ name: '', description: '', effect: 'allow', resource: '', conditions: [], priority: 0 });
      showToast('success', 'Beleid aangemaakt');
    } catch {
      showToast('error', 'Aanmaken mislukt');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Weet je zeker dat je dit beleid wilt verwijderen?')) return;
    try {
      await api.delete(`/policies/${id}`);
      setPolicies(prev => prev.filter(p => p.id !== id));
      showToast('success', 'Beleid verwijderd');
    } catch {
      showToast('error', 'Verwijderen mislukt');
    }
  }

  function addCondition() {
    setNewPolicy(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'user.role', operator: 'eq' as const, value: '' }],
    }));
  }

  function updateCondition(index: number, field: keyof PolicyCondition, value: unknown) {
    setNewPolicy(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }));
  }

  function removeCondition(index: number) {
    setNewPolicy(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  }

  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">ABAC Beleid ({policies.length})</h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" /> Nieuw beleid
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
          <h3 className="font-medium text-gray-900">Nieuw beleid aanmaken</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                value={newPolicy.name}
                onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Beleidsnaam"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
              <input
                type="text"
                value={newPolicy.resource}
                onChange={(e) => setNewPolicy(prev => ({ ...prev, resource: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="theme:* of data:bevolking"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Effect"
              value={newPolicy.effect}
              onChange={(e) => setNewPolicy(prev => ({ ...prev, effect: e.target.value as 'allow' | 'deny' }))}
              options={[
                { value: 'allow', label: 'Toestaan (allow)' },
                { value: 'deny', label: 'Weigeren (deny)' },
              ]}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioriteit</label>
              <input
                type="number"
                value={newPolicy.priority}
                onChange={(e) => setNewPolicy(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
              <input
                type="text"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optioneel"
              />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Condities</label>
              <Button variant="ghost" size="sm" onClick={addCondition}>
                <Plus className="h-3.5 w-3.5" /> Conditie
              </Button>
            </div>

            {newPolicy.conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={condition.field}
                  onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="user.role"
                />
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="eq">is gelijk aan</option>
                  <option value="neq">is niet gelijk aan</option>
                  <option value="in">zit in</option>
                  <option value="not_in">zit niet in</option>
                  <option value="contains">bevat</option>
                  <option value="gte">groter/gelijk</option>
                  <option value="lte">kleiner/gelijk</option>
                </select>
                <input
                  type="text"
                  value={typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value)}
                  onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="waarde"
                />
                <button onClick={() => removeCondition(index)} className="text-red-400 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!newPolicy.name || !newPolicy.resource}>
              <Save className="h-4 w-4" /> Opslaan
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Annuleren</Button>
          </div>
        </div>
      )}

      {/* Policy List */}
      <div className="space-y-2">
        {policies
          .sort((a, b) => b.priority - a.priority)
          .map(policy => (
            <div key={policy.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Shield className={`h-5 w-5 ${policy.effect === 'allow' ? 'text-green-500' : 'text-red-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{policy.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        policy.effect === 'allow' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {policy.effect}
                      </span>
                      <span className="text-xs text-gray-400">P{policy.priority}</span>
                    </div>
                    {policy.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{policy.description}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <code className="bg-gray-100 rounded px-1.5 py-0.5">{policy.resource}</code>
                      {policy.conditions.length > 0 && (
                        <span>· {policy.conditions.length} condities</span>
                      )}
                    </div>
                    {policy.conditions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {policy.conditions.map((c, i) => (
                          <span key={i} className="inline-flex items-center rounded bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            {c.field} <span className="text-gray-400 mx-1">{c.operator}</span> {JSON.stringify(c.value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(policy.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
