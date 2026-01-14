#!/bin/bash

# Замінює всі використання Clerk на Supabase Auth

echo "Заміна Clerk на Supabase Auth..."

# Замінюємо імпорти
find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/import { auth } from "@clerk\/nextjs\/server"/import { createClient } from "@\/lib\/supabase\/server"/g' {} \;

# Замінюємо використання auth()
find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/const { userId } = await auth()/const supabase = await createClient(); const { data: { user: authUser } } = await supabase.auth.getUser(); const userId = authUser?.id/g' {} \;

# Замінюємо перевірки
find app -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/if (!userId)/if (!authUser)/g' {} \;

echo "Готово! Перевірте файли вручну."
