-- Add needs_painting column to contracts table
ALTER TABLE contracts 
ADD COLUMN needs_painting BOOLEAN DEFAULT false;

comment on column contracts.needs_painting is 'Indicates if the property requires painting at the end of the contract';
