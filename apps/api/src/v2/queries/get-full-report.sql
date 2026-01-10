-- Complete Attendance Report Query
-- Returns full report data with JSON aggregation in a single query
-- Optimized to use pre-filled daily_attendance table
-- Parameters:
--   $1: start_date (DATE)
--   $2: end_date (DATE)
--   $3: work_start_minutes (INT)
--   $4: work_end_minutes (INT)
--   $5: late_threshold_minutes (INT)
--   $6: early_out_threshold_minutes (INT)

WITH daily_data AS (
  -- Get daily attendance with computed fields directly from table
  SELECT 
    e.id as employee_id,
    e.biometric_id,
    e.name,
    da.date,
    da.day_code,
    da.status,
    da.first_in,
    da.last_out,
    da.total_minutes,
    da.punch_count,
    -- Compute isLate
    CASE 
      WHEN da.status = 'PRESENT' 
        AND da.first_in IS NOT NULL 
        AND (EXTRACT(HOUR FROM da.first_in::time) * 60 + EXTRACT(MINUTE FROM da.first_in::time)) > ($3::int + $5::int)
      THEN true ELSE false 
    END as is_late,
    -- Compute isEarlyOut
    CASE 
      WHEN da.status = 'PRESENT' 
        AND da.last_out IS NOT NULL 
        AND (EXTRACT(HOUR FROM da.last_out::time) * 60 + EXTRACT(MINUTE FROM da.last_out::time)) < ($4::int - $6::int)
      THEN true ELSE false 
    END as is_early_out,
    -- Compute overtime
    CASE 
      WHEN da.status = 'PRESENT' 
      THEN GREATEST(0, da.total_minutes - ($4::int - $3::int))
      ELSE 0 
    END as overtime
  FROM daily_attendance da
  JOIN employees e ON da.employee_id = e.id
  WHERE da.date >= $1::date AND da.date <= $2::date
),
punches_agg AS (
  -- Aggregate punches by employee and date
  SELECT 
    p.employee_id,
    p.punch_time::date as date,
    json_agg(
      json_build_object(
        'time', TO_CHAR(p.punch_time, 'HH24:MI:SS'),
        'type', COALESCE(p.punch_type, 'UNKNOWN'),
        'verificationType', p.verification_type,
        'isPaired', p.is_paired,
        'isEdited', COALESCE(p.is_edited, false)
      ) ORDER BY p.punch_time
    ) as punches
  FROM punches p
  WHERE p.punch_time >= $1::timestamp AND p.punch_time < ($2::date + 1)::timestamp
  GROUP BY p.employee_id, p.punch_time::date
),
daily_with_punches AS (
  -- Join daily records with punches
  SELECT 
    dd.*,
    COALESCE(pa.punches, '[]'::json) as punches
  FROM daily_data dd
  LEFT JOIN punches_agg pa ON dd.employee_id = pa.employee_id AND dd.date = pa.date
),
user_summary AS (
  -- Calculate user-level summary stats
  SELECT 
    biometric_id,
    name,
    COUNT(*) as total_days,
    COUNT(*) FILTER (WHERE status = 'PRESENT') as present_days,
    COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_days,
    COUNT(*) FILTER (WHERE status = 'INCOMPLETE') as incomplete_days,
    COUNT(*) FILTER (WHERE status = 'COMP') as comp_days,
    COALESCE(SUM(total_minutes) FILTER (WHERE status = 'PRESENT'), 0) as total_working_minutes,
    COUNT(*) FILTER (WHERE is_late) as late_days,
    COUNT(*) FILTER (WHERE is_early_out) as early_out_days,
    COALESCE(SUM(overtime) FILTER (WHERE status = 'PRESENT'), 0) as overtime_minutes,
    -- Aggregate daily records as JSON
    json_agg(
      json_build_object(
        'userId', biometric_id,
        'date', TO_CHAR(date, 'YYYY-MM-DD'),
        'dayCode', day_code,
        'firstIn', first_in,
        'lastOut', last_out,
        'totalHours', FLOOR(total_minutes / 60),
        'totalMinutes', total_minutes % 60,
        'punches', punches,
        'status', status,
        'isLate', is_late,
        'isEarlyOut', is_early_out,
        'overtime', overtime
      ) ORDER BY date
    ) as daily_records
  FROM daily_with_punches
  GROUP BY biometric_id, name
)
-- Final output: array of user summaries
SELECT json_agg(
  json_build_object(
    'userId', biometric_id,
    'userName', COALESCE(name, 'Employee ' || biometric_id),
    'totalDays', total_days,
    'presentDays', present_days,
    'absentDays', absent_days,
    'incompleteDays', incomplete_days,
    'compDays', comp_days,
    'totalWorkingHours', FLOOR(total_working_minutes / 60),
    'totalWorkingMinutes', total_working_minutes % 60,
    'averageHoursPerDay', CASE WHEN present_days > 0 THEN ROUND((total_working_minutes::numeric / 60 / present_days), 2) ELSE 0 END,
    'lateDays', late_days,
    'earlyOutDays', early_out_days,
    'overtimeMinutes', overtime_minutes,
    'dailyRecords', daily_records
  ) ORDER BY biometric_id
) as users,
(SELECT COUNT(*) FROM daily_attendance WHERE date >= $1::date AND date <= $2::date) as total_records,
(SELECT COUNT(DISTINCT employee_id) FROM daily_attendance WHERE date >= $1::date AND date <= $2::date) as unique_users
FROM user_summary;
