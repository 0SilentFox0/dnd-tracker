export default function DmSectionLoading() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse">Завантаження...</p>
      </div>
    </div>
  );
}
