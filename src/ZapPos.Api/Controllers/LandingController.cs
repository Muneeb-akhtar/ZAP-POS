using Microsoft.AspNetCore.Mvc;

namespace ZapPos.Api.Controllers;

/// <summary>
/// Serves the content shown on the public landing page.
/// For now it reads Data/landing-content.json; the admin panel will replace this
/// with a database so content can be edited without redeploying.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class LandingController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "landing-content.json");
        if (!System.IO.File.Exists(path))
            return NotFound(new { message = "landing-content.json not found" });

        var json = await System.IO.File.ReadAllTextAsync(path);
        return Content(json, "application/json");
    }
}
