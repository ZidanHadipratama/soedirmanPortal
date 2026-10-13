begin;
alter table public.attendance_records alter column status drop not null;
alter table public.attendance_records drop constraint attendance_records_status_check;
alter table public.attendance_records disable trigger stamp_attendance;
update public.attendance_records set status = null where status = 'Belum dicatat';
alter table public.attendance_records enable trigger stamp_attendance;
alter table public.attendance_records add constraint attendance_records_status_check
  check (status in ('Hadir','Sakit','Izin','Dinas Dalam','Tidak Hadir'));
commit;
