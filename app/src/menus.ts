export interface MenuItem {
    label: string;
    link: string;
    icon?: string;
}

export const secondaryMenu: MenuItem[] = [
    {
        label: "Discord",
        link: "https://discord.gg/mS5QvKykvv",
        icon: "discord fab",
    },
    {
        label: "GitHub",
        link: "https://github.com/openwengo/chat-with-gpt.git",
        icon: "github fab",
    },
];