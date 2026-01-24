-- Allow authenticated users to delete their own studies and associated records
drop policy if exists "Authenticated users can delete studies" on public.studies;
create policy "Authenticated users can delete studies"
  on public.studies
  for delete
  to authenticated
  using (true);

drop policy if exists "Authenticated users can delete triage_results" on public.triage_results;
create policy "Authenticated users can delete triage_results"
  on public.triage_results
  for delete
  to authenticated
  using (true);

drop policy if exists "Authenticated users can delete lab_results" on public.lab_results;
create policy "Authenticated users can delete lab_results"
  on public.lab_results
  for delete
  to authenticated
  using (true);

drop policy if exists "Authenticated users can delete feedback" on public.feedback_events;
create policy "Authenticated users can delete feedback"
  on public.feedback_events
  for delete
  to authenticated
  using (true);