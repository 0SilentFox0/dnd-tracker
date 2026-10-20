import { describe, expect, it } from "vitest";

import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { parseArtifactHtml } from "@/scripts/import/scenario/parse-artifact";

const scene = `<!DOCTYPE html><html><body>
<header class="title"><h1>Монастир Світла</h1><p>Сцена перша</p>
<div class="legend"><span><i style="background:var(--blood)"></i>Читати вголос і події</span><span><i style="background:#5B3A78"></i>Тіньова лінія Аграїла</span></div></header>
<main>
<section id="s10"><h2>1.0 Собор Ельрата</h2>
<div class="row"><div class="story">
<div class="mark shadow"><span class="tag">Тіньова лінія: пролог</span><p>Короткий пролог.</p></div>
<div class="read"><p>Дах старої дзвіниці.</p></div>
<p class="say">«Наречену взяти живою»</p>
<h3>Прорив</h3>
<div class="mark token"><span class="tag">Жетон</span><ul><li><span class="g"></span>Іде <b>одразу</b>.</li></ul></div>
</div>
<aside class="notes"><p class="secret"><b class="secret">Записка:</b> дитячий сміх.</p><table><tr><td>1.0</td><td>Лишитися</td></tr></table></aside>
</div>
<div class="row"><div class="story"><p>Друга частина.</p></div><aside class="notes"></aside></div>
</section>
</main></body></html>`;

const hero = `<html><body><header class="title"><h1>Лорд Годрик</h1><p>Паладин.</p><p class="quote">«Світло не обирають»</p></header>
<main class="wrap"><section><h2>Історія</h2><p>Ти паладин.</p></section>
<section><h2>На що звертати увагу</h2><div class="key"><b>Обов'язок</b>Віра абсолютна.</div><div class="goal"><b>Ціль</b>Захистити.</div><div class="secretbox"><b class="t">Тавро</b><p>Пече.</p></div></section>
<section><h2>Люди</h2><table class="people"><tr><td>Ніколас</td><td>Учень.</td></tr></table><ul class="prio"><li>Обов'язок.</li></ul></section></main></body></html>`;

const types = (nodes: { type: string }[] | undefined) => (nodes ?? []).map((n) => n.type);

describe("parseArtifactHtml", () => {
  it("сцена: заголовок, легенда, розділи й рядки з колонками", () => {
    const { title, subtitle, content } = parseArtifactHtml(scene, "scene");

    expect(title).toBe("Монастир Світла");
    expect(subtitle).toBe("Сцена перша");
    expect(content.legend).toEqual([
      { kind: "read", label: "Читати вголос і події" },
      { kind: "shadow", label: "Тіньова лінія Аграїла" },
    ]);
    expect(content.sections).toHaveLength(1);
    expect(content.sections[0].title).toBe("1.0 Собор Ельрата");
    expect(content.sections[0].rows).toHaveLength(2);

    const story = content.sections[0].rows[0].story.content;

    expect(types(story)).toEqual(["callout", "readAloud", "say", "heading", "callout"]);
    expect(story[0].attrs).toEqual({ kind: "shadow", tag: "Тіньова лінія: пролог" });
    expect(types(story[4].content)).toEqual(["bulletList"]);

    const li = story[4].content?.[0].content?.[0].content?.[0].content ?? [];

    expect(li[0]).toEqual({ type: "token", attrs: { color: "green" } });
    expect(li.find((n) => n.text === "одразу")?.marks).toEqual([{ type: "bold" }]);

    const notes = content.sections[0].rows[0].notes.content;

    expect(notes[0].content?.[0].marks).toEqual(expect.arrayContaining([{ type: "secret" }, { type: "bold" }]));
    expect(notes[0].content?.[1].marks).toEqual([{ type: "secret" }]);
    expect(types(notes)).toEqual(["paragraph", "table"]);
    expect(content.sections[0].rows[1].notes.content).toEqual([]);
  });

  it("герой: розділ = глава з одним рядком, маркери key/goal/secretbox, цитата як репліка", () => {
    const { title, subtitle, content } = parseArtifactHtml(hero, "hero");

    expect(title).toBe("Лорд Годрик");
    expect(subtitle).toBe("Паладин.");
    expect(content.sections.map((s) => s.title)).toEqual(["Історія", "На що звертати увагу", "Люди"]);
    expect(content.sections.every((s) => s.rows.length === 1 && s.reveal?.mode === "manual" && !s.revealedAt)).toBe(true);
    expect(types(content.sections[0].rows[0].story.content)).toEqual(["say", "paragraph"]);

    const callouts = content.sections[1].rows[0].story.content;

    expect(callouts.map((c) => c.attrs)).toEqual([
      { kind: "hero", tag: "Обов'язок" },
      { kind: "goal", tag: "Ціль" },
      { kind: "confide", tag: "Тавро" },
    ]);
    expect(types(content.sections[2].rows[0].story.content)).toEqual(["table", "bulletList"]);
  });

  it("результат проходить схему", () => {
    expect(scenarioContentSchema.safeParse(parseArtifactHtml(scene, "scene").content).success).toBe(true);
    expect(scenarioContentSchema.safeParse(parseArtifactHtml(hero, "hero").content).success).toBe(true);
  });
});
