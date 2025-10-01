// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xaavnuggyscrzmcmykfo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYXZudWdneXNjcnptY215a2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjMxNDUsImV4cCI6MjA2NDg5OTE0NX0.AFpoNlNClWyHT7L-Uue0ewGvscDLlF5vTCCm7nxnyec';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
