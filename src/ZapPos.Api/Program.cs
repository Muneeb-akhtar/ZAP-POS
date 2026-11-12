var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var app = builder.Build();

// In development, the React dev server (npm run dev) forwards /api calls here through its proxy.
// In production, the React build (npm run build) is output to wwwroot and served from here.
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
