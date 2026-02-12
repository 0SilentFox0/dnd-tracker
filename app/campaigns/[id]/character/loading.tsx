export default function CharacterLoading() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Завантаження персонажа...
        </p>
      </div>
    </div>
  );
}
