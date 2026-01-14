#!/bin/bash

# Виправляє всі сторінки: замінює Clerk на Supabase та виправляє params

FILES=(
  "app/campaigns/[id]/character/page.tsx"
  "app/campaigns/[id]/dm/characters/page.tsx"
  "app/campaigns/[id]/dm/npc-heroes/page.tsx"
  "app/campaigns/[id]/dm/units/page.tsx"
  "app/campaigns/[id]/dm/spells/page.tsx"
  "app/campaigns/[id]/dm/artifacts/page.tsx"
  "app/campaigns/[id]/dm/battles/page.tsx"
  "app/campaigns/[id]/battles/[battleId]/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Виправляю $file..."
    
    # Замінюємо імпорти
    sed -i '' 's/import { auth } from "@clerk\/nextjs\/server";/import { getAuthUser } from "@\/lib\/auth";/g' "$file"
    
    # Замінюємо params на Promise
    sed -i '' 's/params: { id: string }/params: Promise<{ id: string }>/g' "$file"
    sed -i '' 's/params: { id: string; battleId: string }/params: Promise<{ id: string; battleId: string }>/g' "$file"
    
    # Замінюємо auth() на getAuthUser()
    sed -i '' 's/const { userId } = await auth();/const user = await getAuthUser(); const userId = user.id;/g' "$file"
    
    # Додаємо await params
    sed -i '' '/export default async function.*{/a\
  const resolvedParams = await params;
' "$file"
    
    # Замінюємо params.id на resolvedParams.id
    sed -i '' 's/params\.id/resolvedParams.id/g' "$file"
    sed -i '' 's/params\.battleId/resolvedParams.battleId/g' "$file"
    
    echo "✅ $file виправлено"
  fi
done

echo "Готово!"
