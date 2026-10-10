@echo off
rem Jinhuan Moyu Helper: makes the Jinhuan moyu popup truly transparent / always-on-top. Exit from the tray icon.
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$s=[IO.File]::ReadAllText('%~f0'); iex $s.Substring($s.IndexOf('#'+'PSSTART'))"
exit /b
#PSSTART
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class JhW {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr h, int i, int v);
  [DllImport("user32.dll")] static extern bool SetLayeredWindowAttributes(IntPtr h, uint k, byte a, uint f);
  [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int k);
  public static List<KeyValuePair<IntPtr, string>> Find(string pat) {
    var re = new System.Text.RegularExpressions.Regex(pat);
    var r = new List<KeyValuePair<IntPtr, string>>();
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(256);
      GetWindowText(h, sb, 256);
      var t = sb.ToString();
      if (re.IsMatch(t)) r.Add(new KeyValuePair<IntPtr, string>(h, t));
      return true;
    }, IntPtr.Zero);
    return r;
  }
  public static void Alpha(IntPtr h, byte a) {
    int ex = GetWindowLong(h, -20);
    if ((ex & 0x80000) == 0) SetWindowLong(h, -20, ex | 0x80000);
    SetLayeredWindowAttributes(h, 0, a, 2);
  }
  public static void Top(IntPtr h, bool on) {
    SetWindowPos(h, new IntPtr(on ? -1 : -2), 0, 0, 0, 0, 0x0013);
  }
  public static bool Down(int k) { return (GetAsyncKeyState(k) & 0x8000) != 0; }
}
'@

$pat = ([string][char]0x5C3D + [char]0x6B22 + ' ' + [char]0xB7 + ' ' + [char]0x6478 + [char]0x9C7C + ' ' + [char]0xB7 + ' (\d+)%')
$pinWord = [string][char]0x7F6E + [char]0x9876
$state = @{}
$ghost = $false
$pinFlip = $false
$prevG = $false; $prevP = $false

$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = [System.Drawing.SystemIcons]::Application
$tray.Text = 'Jinhuan Moyu Helper'
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$tip = 'Alt+` hold: show   Ctrl+Alt+`: hide/show   Ctrl+Alt+P: pin/unpin'
[void]$menu.Items.Add($tip)
[void]$menu.Items.Add('Exit').add_Click({
  foreach ($w in [JhW]::Find($pat)) { [JhW]::Alpha($w.Key, 255); [JhW]::Top($w.Key, $false) }
  $tray.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})
$tray.ContextMenuStrip = $menu
$tray.Visible = $true
$tray.ShowBalloonTip(3000, 'Jinhuan Moyu Helper', $tip, 'Info')

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 60
$timer.add_Tick({
  $ctrl = [JhW]::Down(0x11); $alt = [JhW]::Down(0x12)
  $tick = [JhW]::Down(0xC0); $p = [JhW]::Down(0x50)
  $g = $ctrl -and $alt -and $tick
  $pp = $ctrl -and $alt -and $p
  if ($g -and -not $script:prevG) { $script:ghost = -not $script:ghost }
  if ($pp -and -not $script:prevP) { $script:pinFlip = -not $script:pinFlip }
  $script:prevG = $g; $script:prevP = $pp
  $hold = $alt -and $tick -and -not $ctrl
  foreach ($w in [JhW]::Find($pat)) {
    $m = [regex]::Match($w.Value, $pat)
    $op = [Math]::Min(100, [int]$m.Groups[1].Value)
    if ($script:ghost) { $op = 0 }
    if ($hold) { $op = 100 }
    $a = [byte][Math]::Round($op * 2.55)
    $top = $w.Value.Contains($pinWord) -xor $script:pinFlip
    $k = [string]$w.Key
    $s = $script:state[$k]
    if (-not $s -or $s.a -ne $a) { [JhW]::Alpha($w.Key, $a) }
    if (-not $s -or $s.t -ne $top) { [JhW]::Top($w.Key, $top) }
    $script:state[$k] = @{ a = $a; t = $top }
  }
})
$timer.Start()
[System.Windows.Forms.Application]::Run()
