// env.js — SOMENTE JS (sem <script>)
// 1) chaves do Supabase
window.SUPABASE_URL = 'https://qxsswtqpuyfdqaglfucq.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3N3dHFwdXlmZHFhZ2xmdWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTc2MTYsImV4cCI6MjA3NzY5MzYxNn0.Bnsc3MthswmnMLN05ZJjaVJa0VhUFq1KLLr_QBZydvo';

// 2) cria o cliente global
window.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
