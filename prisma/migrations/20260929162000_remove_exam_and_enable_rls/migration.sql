-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN IF EXISTS "exam";

-- Enable Row Level Security
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy
DROP POLICY IF EXISTS "Allow all operations for service role" ON "UserProfile";
CREATE POLICY "Allow all operations for service role" ON "UserProfile"
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
