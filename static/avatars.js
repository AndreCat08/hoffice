// Hoffice Agent Pixel-Art Avatars
// Designed by Irene for Hoffice Virtual Office
(function () {
  const AVATARS = {
    sandy: {
      name: "Sandy",
      role: "Tech Lead",
      color: "#3b82f6",
      badgeColor: "#1e3a8a",
      // 24x24 Pixel Art SVG
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <!-- Background circle/shield -->
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#1e3a8a"/>
        <!-- Hair (neat side part) -->
        <rect x="7" y="4" width="10" height="3" fill="#0f172a"/>
        <rect x="6" y="6" width="3" height="4" fill="#0f172a"/>
        <rect x="15" y="6" width="3" height="3" fill="#0f172a"/>
        <!-- Face/Skin -->
        <rect x="8" y="7" width="8" height="7" fill="#fcd34d"/>
        <!-- Eyebrows -->
        <rect x="8" y="8" width="3" height="1" fill="#0f172a"/>
        <rect x="13" y="8" width="3" height="1" fill="#0f172a"/>
        <!-- Gold Tech Lead Glasses -->
        <rect x="8" y="9" width="3" height="2" fill="none" stroke="#fbbf24" stroke-width="0.8"/>
        <rect x="13" y="9" width="3" height="2" fill="none" stroke="#fbbf24" stroke-width="0.8"/>
        <rect x="11" y="9" width="2" height="1" fill="#fbbf24"/>
        <!-- Eyes behind glass -->
        <rect x="9" y="10" width="1" height="1" fill="#0f172a"/>
        <rect x="14" y="10" width="1" height="1" fill="#0f172a"/>
        <!-- Smile -->
        <rect x="11" y="12" width="2" height="1" fill="#b45309"/>
        <!-- Suit Collar & Tie -->
        <rect x="7" y="14" width="10" height="7" fill="#1e40af"/>
        <polygon points="10,14 12,17 14,14" fill="#f8fafc"/>
        <rect x="11" y="15" width="2" height="5" fill="#fbbf24"/>
        <!-- Tech Lead Star Badge -->
        <rect x="14" y="16" width="2" height="2" fill="#fde047"/>
      </svg>`
    },

    chao: {
      name: "Chao",
      role: "Backend Engineer",
      color: "#10b981",
      badgeColor: "#064e3b",
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#064e3b"/>
        <!-- Charcoal Hoodie Over Head -->
        <rect x="6" y="4" width="12" height="10" rx="2" fill="#334155"/>
        <rect x="5" y="7" width="2" height="7" fill="#334155"/>
        <rect x="17" y="7" width="2" height="7" fill="#334155"/>
        <!-- Inner Face Shadow & Face -->
        <rect x="8" y="7" width="8" height="6" fill="#fde047"/>
        <!-- Dark hair bangs -->
        <rect x="8" y="7" width="8" height="2" fill="#1e293b"/>
        <rect x="10" y="9" width="1" height="1" fill="#1e293b"/>
        <!-- Intense Focused Eyes (terminal reflection) -->
        <rect x="9" y="10" width="2" height="1" fill="#10b981"/>
        <rect x="13" y="10" width="2" height="1" fill="#10b981"/>
        <!-- Hoodie body -->
        <rect x="6" y="14" width="12" height="7" fill="#1e293b"/>
        <!-- Neon Green Drawstrings -->
        <rect x="10" y="14" width="1" height="5" fill="#10b981"/>
        <rect x="13" y="14" width="1" height="5" fill="#10b981"/>
        <!-- Steaming Coffee Cup in corner -->
        <rect x="16" y="17" width="4" height="4" rx="1" fill="#e2e8f0"/>
        <rect x="17" y="15" width="1" height="2" fill="#38bdf8"/>
        <rect x="19" y="14" width="1" height="2" fill="#38bdf8"/>
      </svg>`
    },

    irene: {
      name: "Irene",
      role: "Frontend Engineer",
      color: "#8b5cf6",
      badgeColor: "#581c87",
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#581c87"/>
        <!-- Magenta/Purple Bob Hair -->
        <rect x="6" y="4" width="12" height="4" fill="#c084fc"/>
        <rect x="5" y="7" width="3" height="7" fill="#c084fc"/>
        <rect x="16" y="7" width="3" height="7" fill="#c084fc"/>
        <!-- Face/Skin -->
        <rect x="8" y="7" width="8" height="7" fill="#fcd34d"/>
        <!-- Stylish bangs -->
        <rect x="8" y="7" width="3" height="2" fill="#a855f7"/>
        <rect x="13" y="7" width="3" height="1" fill="#a855f7"/>
        <!-- Sparkly eyes -->
        <rect x="9" y="10" width="1" height="1" fill="#06b6d4"/>
        <rect x="14" y="10" width="1" height="1" fill="#06b6d4"/>
        <!-- Blush -->
        <rect x="8" y="12" width="2" height="1" fill="#f43f5e"/>
        <rect x="14" y="12" width="2" height="1" fill="#f43f5e"/>
        <!-- Smile -->
        <rect x="11" y="12" width="2" height="1" fill="#be123c"/>
        <!-- Cyan Audio Headset with Mic -->
        <path d="M5 8 C5 4, 19 4, 19 8" fill="none" stroke="#06b6d4" stroke-width="1.5"/>
        <rect x="4" y="8" width="2" height="4" rx="1" fill="#06b6d4"/>
        <rect x="18" y="8" width="2" height="4" rx="1" fill="#06b6d4"/>
        <rect x="18" y="12" width="1" height="3" fill="#0891b2"/>
        <rect x="16" y="14" width="2" height="1" fill="#06b6d4"/>
        <!-- Chic Violet Top -->
        <rect x="6" y="14" width="12" height="7" fill="#7c3aed"/>
        <rect x="9" y="14" width="6" height="2" fill="#ec4899"/>
      </svg>`
    },

    probe: {
      name: "Probe",
      role: "QA Engineer",
      color: "#f59e0b",
      badgeColor: "#78350f",
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#78350f"/>
        <!-- Yellow Safety Hardhat -->
        <rect x="6" y="3" width="12" height="5" rx="1" fill="#eab308"/>
        <rect x="5" y="7" width="14" height="2" fill="#ca8a04"/>
        <!-- Headlamp on Helmet -->
        <rect x="11" y="5" width="2" height="2" fill="#fef08a"/>
        <!-- Face/Skin -->
        <rect x="8" y="8" width="8" height="6" fill="#fcd34d"/>
        <!-- Short brown sideburns -->
        <rect x="7" y="9" width="1" height="3" fill="#78350f"/>
        <rect x="16" y="9" width="1" height="3" fill="#78350f"/>
        <!-- Alert Eyeballs -->
        <rect x="9" y="10" width="2" height="2" fill="#ffffff"/>
        <rect x="10" y="10" width="1" height="1" fill="#0f172a"/>
        <rect x="13" y="10" width="2" height="2" fill="#ffffff"/>
        <rect x="14" y="10" width="1" height="1" fill="#0f172a"/>
        <!-- Determined Mouth -->
        <rect x="10" y="13" width="4" height="1" fill="#b45309"/>
        <!-- Hi-Vis QA Safety Vest -->
        <rect x="6" y="14" width="12" height="7" fill="#f97316"/>
        <rect x="8" y="14" width="2" height="7" fill="#e2e8f0"/>
        <rect x="14" y="14" width="2" height="7" fill="#e2e8f0"/>
        <!-- Magnifying Glass Icon -->
        <circle cx="18" cy="18" r="2.5" fill="none" stroke="#38bdf8" stroke-width="1"/>
        <rect x="19.5" y="19.5" width="2.5" height="1" transform="rotate(45 19.5 19.5)" fill="#64748b"/>
      </svg>`
    },

    robert: {
      name: "Robert",
      role: "Security & Review",
      color: "#ef4444",
      badgeColor: "#7f1d1d",
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#7f1d1d"/>
        <!-- Sleek Dark Hair -->
        <rect x="7" y="4" width="10" height="4" fill="#020617"/>
        <rect x="6" y="6" width="2" height="4" fill="#020617"/>
        <rect x="16" y="6" width="2" height="4" fill="#020617"/>
        <!-- Face/Skin -->
        <rect x="8" y="7" width="8" height="7" fill="#fcd34d"/>
        <!-- Agent Sunglasses (Blackout with glint) -->
        <rect x="8" y="9" width="4" height="2" rx="0.5" fill="#0f172a"/>
        <rect x="12" y="9" width="4" height="2" rx="0.5" fill="#0f172a"/>
        <rect x="11" y="9" width="2" height="1" fill="#0f172a"/>
        <rect x="9" y="9" width="1" height="1" fill="#ffffff"/>
        <rect x="13" y="9" width="1" height="1" fill="#ffffff"/>
        <!-- Serious Firm Line -->
        <rect x="10" y="13" width="4" height="1" fill="#7f1d1d"/>
        <!-- Security Suit & Crimson Tie -->
        <rect x="6" y="14" width="12" height="7" fill="#0f172a"/>
        <polygon points="10,14 12,17 14,14" fill="#f8fafc"/>
        <rect x="11.5" y="15" width="1" height="6" fill="#ef4444"/>
        <!-- Gold Security Shield Badge -->
        <path d="M15 16 L17 16 L17 18 L16 19 L15 18 Z" fill="#fbbf24"/>
      </svg>`
    },

    iroi: {
      name: "Iroi",
      role: "DevOps & SRE",
      color: "#06b6d4",
      badgeColor: "#164e63",
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#164e63"/>
        <!-- Orange DevOps Bandana/Cap -->
        <rect x="6" y="4" width="12" height="4" fill="#ea580c"/>
        <rect x="16" y="6" width="3" height="3" fill="#c2410c"/>
        <!-- Face/Skin -->
        <rect x="8" y="7" width="8" height="7" fill="#fcd34d"/>
        <!-- Brown Hair Locks under bandana -->
        <rect x="7" y="7" width="1" height="3" fill="#451a03"/>
        <rect x="16" y="7" width="1" height="3" fill="#451a03"/>
        <!-- Cheerful sharp eyes -->
        <rect x="9" y="9" width="2" height="1" fill="#0f172a"/>
        <rect x="13" y="9" width="2" height="1" fill="#0f172a"/>
        <!-- Confident Grin -->
        <rect x="10" y="12" width="4" height="1" fill="#c2410c"/>
        <!-- Steel-Blue Jumpsuit & Harness -->
        <rect x="6" y="14" width="12" height="7" fill="#0284c7"/>
        <rect x="7" y="14" width="2" height="7" fill="#334155"/>
        <rect x="15" y="14" width="2" height="7" fill="#334155"/>
        <!-- Silver Tool Wrench -->
        <rect x="17" y="15" width="2" height="5" fill="#94a3b8"/>
        <rect x="16" y="14" width="4" height="1.5" fill="#cbd5e1"/>
      </svg>`
    },

    quill: {
      name: "Quill",
      role: "Technical Writer",
      color: "#14b8a6",
      badgeColor: "#134e4a",
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#134e4a"/>
        <!-- Vintage Brown Scholar Cap / Beret -->
        <ellipse cx="12" cy="5" rx="6" ry="2.5" fill="#78350f"/>
        <rect x="16" y="4" width="2" height="3" fill="#b45309"/>
        <!-- Face/Skin -->
        <rect x="8" y="7" width="8" height="7" fill="#fcd34d"/>
        <!-- Auburn curls -->
        <rect x="6" y="7" width="2" height="4" fill="#92400e"/>
        <rect x="16" y="7" width="2" height="4" fill="#92400e"/>
        <!-- Round Intellectual Spectacles -->
        <circle cx="10" cy="10" r="1.5" fill="none" stroke="#0284c7" stroke-width="0.7"/>
        <circle cx="14" cy="10" r="1.5" fill="none" stroke="#0284c7" stroke-width="0.7"/>
        <rect x="11.5" y="10" width="1" height="0.5" fill="#0284c7"/>
        <!-- Gentle Smile -->
        <rect x="11" y="12" width="2" height="1" fill="#92400e"/>
        <!-- Tweed Emerald Vest & Cream Shirt -->
        <rect x="6" y="14" width="12" height="7" fill="#047857"/>
        <polygon points="10,14 12,17 14,14" fill="#fef3c7"/>
        <!-- Golden Feather Quill -->
        <path d="M17 18 Q19 14 20 12 Q20 15 18 19 Z" fill="#fbbf24"/>
        <rect x="17" y="19" width="1" height="2" fill="#78350f"/>
      </svg>`
    },

    user: {
      name: "You",
      role: "Admin",
      color: "#6366f1",
      badgeColor: "#312e81",
      svg: `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
        <rect width="24" height="24" rx="4" fill="#1e293b"/>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#312e81"/>
        <!-- Cool Modern Dark Hair -->
        <rect x="7" y="4" width="10" height="4" fill="#09090b"/>
        <rect x="6" y="6" width="2" height="4" fill="#09090b"/>
        <rect x="16" y="6" width="2" height="4" fill="#09090b"/>
        <!-- Face/Skin -->
        <rect x="8" y="7" width="8" height="7" fill="#fcd34d"/>
        <!-- Eyes -->
        <rect x="9" y="10" width="2" height="1" fill="#09090b"/>
        <rect x="13" y="10" width="2" height="1" fill="#09090b"/>
        <!-- Smile -->
        <rect x="11" y="12" width="2" height="1" fill="#b45309"/>
        <!-- Tech Indigo Hoodie -->
        <rect x="6" y="14" width="12" height="7" fill="#4338ca"/>
        <rect x="10" y="14" width="4" height="3" fill="#818cf8"/>
      </svg>`
    }
  };

  function getAgentAvatarSvg(id) {
    const key = (id || "").toLowerCase();
    if (AVATARS[key]) {
      return AVATARS[key].svg;
    }
    // Fallback initials
    const initial = (id || "?")[0].toUpperCase();
    return `<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#334155"/>
      <text x="12" y="16" font-size="12" font-weight="bold" fill="#f8fafc" text-anchor="middle" font-family="sans-serif">${initial}</text>
    </svg>`;
  }

  window.HofficeAvatars = {
    AVATARS,
    getAgentAvatarSvg
  };
})();
