
DROP POLICY IF EXISTS "Professors update their own exams" ON public.exams;
CREATE POLICY "Professors update their own exams"
ON public.exams
FOR UPDATE
TO authenticated
USING (
  professor_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'professor'
  )
)
WITH CHECK (
  professor_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'professor'
  )
);

DROP POLICY IF EXISTS "Professors delete their own exams" ON public.exams;
CREATE POLICY "Professors delete their own exams"
ON public.exams
FOR DELETE
TO authenticated
USING (
  professor_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'professor'
  )
);
