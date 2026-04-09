'use client';

import { useParams } from 'next/navigation';
import { ProjectAttendance } from '@/components/project/project-attendance';

export default function AttendancePage() {
  const { id } = useParams<{ id: string }>();
  return <ProjectAttendance projectId={id} />;
}
