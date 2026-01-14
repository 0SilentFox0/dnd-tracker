#!/bin/bash

# Скрипт для виправлення всіх API routes:
# 1. Замінює Clerk на Supabase
# 2. Виправляє params на Promise<params>

echo "Виправлення API routes..."

# Список файлів для виправлення
FILES=(
  "app/api/campaigns/[id]/characters/[characterId]/route.ts"
  "app/api/campaigns/[id]/units/route.ts"
  "app/api/campaigns/[id]/spells/route.ts"
  "app/api/campaigns/[id]/battles/route.ts"
  "app/api/campaigns/[id]/battles/[battleId]/route.ts"
  "app/api/campaigns/[id]/battles/[battleId]/start/route.ts"
  "app/api/campaigns/[id]/battles/[battleId]/attack/route.ts"
  "app/api/campaigns/[id]/battles/[battleId]/next-turn/route.ts"
  "app/api/campaigns/join/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Виправляю $file..."
    
    # Замінюємо імпорти Clerk на Supabase
    sed -i '' 's/import { auth } from "@clerk\/nextjs\/server";/import { createClient } from "@\/lib\/supabase\/server";/g' "$file"
    
    # Замінюємо params на Promise<params>
    sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' "$file"
    sed -i '' 's/{ params }: { params: { id: string; characterId: string } }/{ params }: { params: Promise<{ id: string; characterId: string }> }/g' "$file"
    sed -i '' 's/{ params }: { params: { id: string; battleId: string } }/{ params }: { params: Promise<{ id: string; battleId: string }> }/g' "$file"
    
    # Додаємо await params та витягуємо id
    sed -i '' '/export async function.*{/a\
  const resolvedParams = await params;
' "$file"
    
    echo "✅ $file виправлено"
  fi
done

echo "Готово! Перевірте файли вручну."
