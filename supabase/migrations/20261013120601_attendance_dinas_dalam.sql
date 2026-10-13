begin;
-- Keep the author, timestamp and revision when changing vocabulary only.
alter table public.attendance_records drop constraint attendance_records_status_check;
alter table public.attendance_records disable trigger stamp_attendance;
update public.attendance_records set status = 'Dinas Dalam' where status = 'Dinas Luar';
alter table public.attendance_records enable trigger stamp_attendance;
alter table public.attendance_records add constraint attendance_records_status_check
  check (status in ('Belum dicatat','Hadir','Sakit','Izin','Dinas Dalam','Tidak Hadir'));
commit;
