import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { inventoryApi } from '../api/client';
import type { AssignmentWithAsset, Person } from '../api/types';
import { ErrorState, LoadingState } from '../components/Feedback';
import StatusBadge from '../components/StatusBadge';

export default function PeoplePage() {
  const peopleQuery = useQuery({
    queryKey: ['people'],
    queryFn: () => inventoryApi.listPeople(),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedPeople: Person[] = useMemo(() => {
    if (!peopleQuery.data) return [];
    return [...peopleQuery.data].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [peopleQuery.data]);

  useEffect(() => {
    if (!selectedId && sortedPeople.length) {
      setSelectedId(sortedPeople[0].id);
    }
  }, [sortedPeople, selectedId]);

  const assignmentsQuery = useQuery({
    queryKey: ['people', selectedId, 'assignments'],
    enabled: Boolean(selectedId),
    queryFn: () => inventoryApi.getPersonAssignments(selectedId as string),
  });

  if (peopleQuery.isLoading) {
    return <LoadingState label="Loading people" />;
  }

  if (peopleQuery.isError || !peopleQuery.data) {
    return <ErrorState message="Unable to load people." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600">People</h2>
        <ul className="mt-4 space-y-2">
          {sortedPeople.map((person) => (
            <li key={person.id}>
              <button
                onClick={() => setSelectedId(person.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  person.id === selectedId
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-500/50'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">{person.full_name}</div>
                <div className="text-xs text-slate-400">{person.email ?? person.username ?? 'No account'}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="lg:col-span-2">
        {!selectedId ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Select a person to view assignments.
          </div>
        ) : assignmentsQuery.isLoading ? (
          <LoadingState label="Loading assignments" />
        ) : assignmentsQuery.isError || !assignmentsQuery.data ? (
          <ErrorState message="Unable to load assignments." />
        ) : (
          <AssignmentsPanel assignments={assignmentsQuery.data} />
        )}
      </section>
    </div>
  );
}

function AssignmentsPanel({ assignments }: { assignments: AssignmentWithAsset[] }) {
  if (!assignments.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No assignments recorded for this person.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">{assignment.asset.asset_tag ?? 'Untitled asset'}</div>
              <div className="text-xs text-slate-400">Primary device: {assignment.primary_device ? 'Yes' : 'No'}</div>
            </div>
            <StatusBadge status={assignment.asset.status} />
          </div>
          <dl className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-600">Assigned</dt>
              <dd>{new Date(assignment.start_date).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">Returned</dt>
              <dd>{assignment.end_date ? new Date(assignment.end_date).toLocaleDateString() : 'Still in use'}</dd>
            </div>
            {assignment.expected_return_date ? (
              <div>
                <dt className="font-medium text-slate-600">Expected return</dt>
                <dd>{new Date(assignment.expected_return_date).toLocaleDateString()}</dd>
              </div>
            ) : null}
            {assignment.notes ? (
              <div className="sm:col-span-2">
                <dt className="font-medium text-slate-600">Notes</dt>
                <dd className="whitespace-pre-wrap text-slate-500">{assignment.notes}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ))}
    </div>
  );
}
