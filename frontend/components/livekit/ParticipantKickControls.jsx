'use client';

import { useMemo, useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { Loader2, UserMinus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { liveClassAPI } from '@/lib/lmsService';

const participantName = (participant) => participant?.name || participant?.identity || 'Student';

const apiErrorText = (err) => {
  const data = err.response?.data;
  const value = data?.detail || data?.identity || data?.livekit || data?.non_field_errors || data?.error;
  if (Array.isArray(value)) return value.join(' ');
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return Object.values(value).flat().join(' ');
  return 'Could not remove student from the live class.';
};

export default function ParticipantKickControls({ canManage, classType, classId, onError }) {
  const participants = useParticipants();
  const [open, setOpen] = useState(false);
  const [kickingIdentity, setKickingIdentity] = useState('');

  const studentParticipants = useMemo(
    () => participants.filter((participant) => participant.identity?.startsWith('student-')),
    [participants],
  );

  const kickStudent = async (participant) => {
    const name = participantName(participant);
    if (!window.confirm(`Remove ${name} from this live class?`)) return;

    try {
      onError?.('');
      setKickingIdentity(participant.identity);
      await liveClassAPI.removeParticipant(classType, classId, participant.identity);
      setOpen(false);
    } catch (err) {
      onError?.(apiErrorText(err));
    } finally {
      setKickingIdentity('');
    }
  };

  if (!canManage) return null;

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
        onClick={() => setOpen((value) => !value)}
      >
        <Users className="mr-2 h-4 w-4" />
        Students {studentParticipants.length}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-md border border-white/10 bg-slate-900 text-white shadow-xl">
          <div className="border-b border-white/10 px-3 py-2 text-xs font-medium uppercase text-slate-400">
            In call
          </div>
          {studentParticipants.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-300">No students are currently connected.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-1">
              {studentParticipants.map((participant) => {
                const isKicking = kickingIdentity === participant.identity;
                return (
                  <div key={participant.identity} className="flex items-center justify-between gap-3 rounded px-2 py-2 hover:bg-white/5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{participantName(participant)}</p>
                      <p className="truncate text-xs text-slate-400">{participant.identity}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 flex-none px-2"
                      onClick={() => kickStudent(participant)}
                      disabled={Boolean(kickingIdentity)}
                      aria-label={`Remove ${participantName(participant)}`}
                      title={`Remove ${participantName(participant)}`}
                    >
                      {isKicking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
