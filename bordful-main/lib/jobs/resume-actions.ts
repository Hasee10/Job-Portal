import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type ResumeExperience = {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
};

export type ResumeEducation = {
  school: string;
  degree: string;
  year: string;
};

export type ResumeContent = {
  fullName: string;
  headline: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
};

export const EMPTY_RESUME_CONTENT: ResumeContent = {
  fullName: '',
  headline: '',
  summary: '',
  experience: [],
  education: [],
  skills: [],
};

export type SeekerResume = {
  seekerId: string;
  content: ResumeContent;
  updatedAt: string;
};

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Database is not configured on this deployment.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function rowToResume(row: Record<string, unknown>): SeekerResume {
  return {
    seekerId: row.seeker_id as string,
    content: {
      ...EMPTY_RESUME_CONTENT,
      ...((row.content as Partial<ResumeContent>) || {}),
    },
    updatedAt: row.updated_at as string,
  };
}

export async function getSeekerResume(
  seekerId: string
): Promise<SeekerResume | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('seeker_resumes')
    .select('*')
    .eq('seeker_id', seekerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToResume(data);
}

export async function saveSeekerResume(
  seekerId: string,
  content: ResumeContent
): Promise<SeekerResume> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('seeker_resumes')
    .upsert(
      {
        seeker_id: seekerId,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'seeker_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return rowToResume(data);
}
