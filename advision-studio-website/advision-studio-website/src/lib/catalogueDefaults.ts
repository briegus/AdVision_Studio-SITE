// ═══════════════════════════════════════════════════════════════════════════════
// REPLI HORS LIGNE du catalogue (utilisé seulement si l'API du bot est injoignable ET qu'aucune copie n'est en cache).
// Copie des valeurs par défaut de bot/src/studio/catalogue.ts (DEFAULT_CATALOGUE) : deux services, montage vidéo et création de serveurs Discord.
// La source de vérité est le catalogue du bot, modifiable depuis l'administration : ce fichier n'a pas à être modifié pour ajouter ou changer une prestation.
// Régénération : voir la copie du script dans le rapport (sortie de l'API publique /public/catalogue sur un catalogue par défaut).
// ═══════════════════════════════════════════════════════════════════════════════
import type { PublicCatalogue } from "./catalogue";

export const DEFAULT_PUBLIC_CATALOGUE: PublicCatalogue = {
  "services": [
    {
      "key": "montage",
      "nom": {
        "fr": "Montage vidéo",
        "en": "Video editing"
      },
      "description": {
        "fr": "Montage et finalisation de vos vidéos, adaptés à vos besoins et aux formats des réseaux sociaux.",
        "en": "Editing and finishing of your videos, tailored to your needs and to social media formats."
      },
      "points": [
        {
          "fr": "Montage et assemblage, transitions et effets visuels",
          "en": "Editing and assembly, transitions and visual effects"
        },
        {
          "fr": "Étalonnage et correction des couleurs",
          "en": "Colour grading and colour correction"
        },
        {
          "fr": "Sound design et synchronisation audio",
          "en": "Sound design and audio sync"
        },
        {
          "fr": "Adaptation aux formats des réseaux sociaux, finalisation et exportation",
          "en": "Social media format adaptation, finishing and export"
        }
      ],
      "icon": "scissors",
      "requiresBrand": false,
      "aiNotice": false,
      "questions": [
        {
          "name": "usage",
          "label": {
            "fr": "Type de montage",
            "en": "Type of editing"
          },
          "kind": "select",
          "required": true,
          "options": [
            {
              "value": "social",
              "label": {
                "fr": "Réseaux sociaux",
                "en": "Social media"
              }
            },
            {
              "value": "ad",
              "label": {
                "fr": "Vidéo promotionnelle",
                "en": "Promotional video"
              }
            },
            {
              "value": "other",
              "label": {
                "fr": "Autre",
                "en": "Other"
              }
            }
          ]
        },
        {
          "name": "videos",
          "label": {
            "fr": "Vidéos déjà disponibles",
            "en": "Footage you already have"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Lien (Drive, WeTransfer…) ou courte description",
            "en": "Link (Drive, WeTransfer…) or short description"
          }
        },
        {
          "name": "format",
          "label": {
            "fr": "Format souhaité",
            "en": "Preferred format"
          },
          "kind": "select",
          "required": false,
          "options": [
            {
              "value": "horizontal",
              "label": {
                "fr": "16:9 (paysage)",
                "en": "16:9 (landscape)"
              }
            },
            {
              "value": "vertical",
              "label": {
                "fr": "9:16 (portrait)",
                "en": "9:16 (portrait)"
              }
            },
            {
              "value": "square",
              "label": {
                "fr": "Carré (1:1)",
                "en": "Square (1:1)"
              }
            }
          ],
          "role": "format"
        },
        {
          "name": "resultat",
          "label": {
            "fr": "Résultat attendu",
            "en": "Expected result"
          },
          "kind": "long",
          "required": true,
          "placeholder": {
            "fr": "Ex : Reel dynamique avec sous-titres, vidéo étalonnée avec musique synchronisée…",
            "en": "e.g. dynamic Reel with subtitles, colour-graded video with synced music…"
          }
        }
      ]
    },
    {
      "key": "discord",
      "nom": {
        "fr": "Création de serveurs Discord",
        "en": "Discord server creation"
      },
      "description": {
        "fr": "Un serveur prêt à accueillir votre communauté : salons, rôles et organisation pensés pour votre projet.",
        "en": "A server ready to welcome your community: channels, roles and organisation designed for your project."
      },
      "points": [
        {
          "fr": "Salons, catégories et rôles structurés, permissions configurées",
          "en": "Structured channels, categories and roles, permissions set up"
        },
        {
          "fr": "Installation et configuration de bots, tickets et panels",
          "en": "Bot installation and configuration, tickets and panels"
        },
        {
          "fr": "Règlement et système de modération",
          "en": "Rules and moderation system"
        }
      ],
      "icon": "discord",
      "requiresBrand": false,
      "aiNotice": false,
      "questions": [
        {
          "name": "type_serveur",
          "label": {
            "fr": "Type de serveur",
            "en": "Type of server"
          },
          "kind": "text",
          "required": true,
          "placeholder": {
            "fr": "Ex : gaming, entreprise, créateur de contenu, RP…",
            "en": "e.g. gaming, business, content creator, roleplay…"
          }
        },
        {
          "name": "objectif_serveur",
          "label": {
            "fr": "Objectif du serveur",
            "en": "Purpose of the server"
          },
          "kind": "long",
          "required": true,
          "placeholder": {
            "fr": "À quoi doit servir ce serveur ?",
            "en": "What will this server be used for?"
          }
        },
        {
          "name": "organisation",
          "label": {
            "fr": "Organisation souhaitée",
            "en": "Preferred organisation"
          },
          "kind": "long",
          "required": false,
          "placeholder": {
            "fr": "Salons, catégories, rôles, règles…",
            "en": "Channels, categories, roles, rules…"
          }
        },
        {
          "name": "bots_tickets",
          "label": {
            "fr": "Besoins en bots et tickets",
            "en": "Bots and tickets needed"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : tickets, bienvenue, modération…",
            "en": "e.g. tickets, welcome, moderation…"
          }
        }
      ]
    }
  ],
  "formules": [
    {
      "key": "montage",
      "nom": {
        "fr": "Montage vidéo",
        "en": "Video editing"
      },
      "description": {
        "fr": "Le montage de vos vidéos.",
        "en": "Editing of your footage."
      },
      "services": [
        "montage"
      ],
      "requiresBrand": false,
      "questions": [
        {
          "name": "usage",
          "label": {
            "fr": "Type de montage",
            "en": "Type of editing"
          },
          "kind": "select",
          "required": true,
          "options": [
            {
              "value": "social",
              "label": {
                "fr": "Réseaux sociaux",
                "en": "Social media"
              }
            },
            {
              "value": "ad",
              "label": {
                "fr": "Vidéo promotionnelle",
                "en": "Promotional video"
              }
            },
            {
              "value": "other",
              "label": {
                "fr": "Autre",
                "en": "Other"
              }
            }
          ]
        },
        {
          "name": "videos",
          "label": {
            "fr": "Vidéos déjà disponibles",
            "en": "Footage you already have"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Lien (Drive, WeTransfer…) ou courte description",
            "en": "Link (Drive, WeTransfer…) or short description"
          }
        },
        {
          "name": "format",
          "label": {
            "fr": "Format souhaité",
            "en": "Preferred format"
          },
          "kind": "select",
          "required": false,
          "options": [
            {
              "value": "horizontal",
              "label": {
                "fr": "16:9 (paysage)",
                "en": "16:9 (landscape)"
              }
            },
            {
              "value": "vertical",
              "label": {
                "fr": "9:16 (portrait)",
                "en": "9:16 (portrait)"
              }
            },
            {
              "value": "square",
              "label": {
                "fr": "Carré (1:1)",
                "en": "Square (1:1)"
              }
            }
          ],
          "role": "format"
        },
        {
          "name": "resultat",
          "label": {
            "fr": "Résultat attendu",
            "en": "Expected result"
          },
          "kind": "long",
          "required": true,
          "placeholder": {
            "fr": "Ex : Reel dynamique avec sous-titres, vidéo étalonnée avec musique synchronisée…",
            "en": "e.g. dynamic Reel with subtitles, colour-graded video with synced music…"
          }
        }
      ]
    },
    {
      "key": "discord",
      "nom": {
        "fr": "Création de serveur Discord",
        "en": "Discord server creation"
      },
      "description": {
        "fr": "La création de votre serveur Discord.",
        "en": "Your Discord server creation."
      },
      "services": [
        "discord"
      ],
      "requiresBrand": false,
      "questions": [
        {
          "name": "type_serveur",
          "label": {
            "fr": "Type de serveur",
            "en": "Type of server"
          },
          "kind": "text",
          "required": true,
          "placeholder": {
            "fr": "Ex : gaming, entreprise, créateur de contenu, RP…",
            "en": "e.g. gaming, business, content creator, roleplay…"
          }
        },
        {
          "name": "objectif_serveur",
          "label": {
            "fr": "Objectif du serveur",
            "en": "Purpose of the server"
          },
          "kind": "long",
          "required": true,
          "placeholder": {
            "fr": "À quoi doit servir ce serveur ?",
            "en": "What will this server be used for?"
          }
        },
        {
          "name": "organisation",
          "label": {
            "fr": "Organisation souhaitée",
            "en": "Preferred organisation"
          },
          "kind": "long",
          "required": false,
          "placeholder": {
            "fr": "Salons, catégories, rôles, règles…",
            "en": "Channels, categories, roles, rules…"
          }
        },
        {
          "name": "bots_tickets",
          "label": {
            "fr": "Besoins en bots et tickets",
            "en": "Bots and tickets needed"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : tickets, bienvenue, modération…",
            "en": "e.g. tickets, welcome, moderation…"
          }
        }
      ]
    }
  ]
} as PublicCatalogue;
