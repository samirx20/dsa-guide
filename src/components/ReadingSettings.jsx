import { useEffect } from "react";
import { Moon, Sun, Coffee, Type } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tip } from "@/components/ui/tooltip";
import { usePersistent } from "@/lib/store";

export function useReaderPrefs() {
  const [theme, setTheme] = usePersistent("reader-theme", "light");
  const [font, setFont] = usePersistent("reader-font", "serif");
  const [size, setSize] = usePersistent("reader-size", 18);
  const [width, setWidth] = usePersistent("reader-width", "comfort");
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return { theme, setTheme, font, setFont, size, setSize, width, setWidth };
}

export const WIDTHS = { narrow: "max-w-[640px]", comfort: "max-w-[740px]", wide: "max-w-[900px]" };

export default function ReadingSettings({ prefs }) {
  const { theme, setTheme, font, setFont, size, setSize, width, setWidth } = prefs;
  return (
    <Popover>
      <Tip content="Reading settings">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Reading settings">
            <Type />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent className="w-80 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Theme</Label>
          <ToggleGroup type="single" value={theme} onValueChange={(v) => v && setTheme(v)} className="grid w-full grid-cols-3">
            <ToggleGroupItem value="light">
              <Sun /> Paper
            </ToggleGroupItem>
            <ToggleGroupItem value="sepia">
              <Coffee /> Sepia
            </ToggleGroupItem>
            <ToggleGroupItem value="dark">
              <Moon /> Night
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Body font</Label>
          <ToggleGroup type="single" value={font} onValueChange={(v) => v && setFont(v)} className="grid w-full grid-cols-2">
            <ToggleGroupItem value="serif" className="font-serif">
              Serif
            </ToggleGroupItem>
            <ToggleGroupItem value="sans">Sans</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs text-muted-foreground">Text size</Label>
            <span className="font-mono text-xs">{size}px</span>
          </div>
          <Slider value={[size]} min={15} max={22} step={1} onValueChange={([v]) => setSize(v)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Line width</Label>
          <ToggleGroup type="single" value={width} onValueChange={(v) => v && setWidth(v)} className="grid w-full grid-cols-3">
            <ToggleGroupItem value="narrow">Narrow</ToggleGroupItem>
            <ToggleGroupItem value="comfort">Comfort</ToggleGroupItem>
            <ToggleGroupItem value="wide">Wide</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}
