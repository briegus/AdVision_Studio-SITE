// JEU DE TEST UNIQUEMENT : ancien catalogue (4 services, 6 formules, dont publicité IA et logo). Des catalogues de ce type peuvent encore
// exister côté bot / en cache navigateur : le site doit continuer à les lire. Ce n'est PAS le repli du site (voir ../catalogueDefaults.ts).
import type { PublicCatalogue } from "../catalogue";

export const LEGACY_PUBLIC_CATALOGUE: PublicCatalogue = {
  "services": [
    {
      "key": "pub",
      "nom": {
        "fr": "Publicité vidéo",
        "en": "Video ads"
      },
      "description": {
        "fr": "Plans vidéo générés par intelligence artificielle, puis montés et finalisés par notre équipe.",
        "en": "Video shots generated with artificial intelligence, then edited and finalised by our team."
      },
      "points": [
        {
          "fr": "Rythme, transitions, son et textes à l'écran par notre équipe",
          "en": "Pacing, transitions, sound and on-screen text by our team"
        },
        {
          "fr": "Formats vertical ou horizontal selon vos besoins",
          "en": "Vertical or horizontal formats, depending on your needs"
        },
        {
          "fr": "Option : ajouter la création d'un logo",
          "en": "Option: add a logo to your order"
        }
      ],
      "icon": "video",
      "requiresBrand": false,
      "aiNotice": true,
      "questions": [
        {
          "name": "objectif",
          "label": {
            "fr": "Objectif de la publicité",
            "en": "Goal of the ad"
          },
          "kind": "long",
          "required": true,
          "placeholder": {
            "fr": "Ex : lancer un produit, faire connaître la marque…",
            "en": "e.g. launch a product, build brand awareness…"
          }
        },
        {
          "name": "produit",
          "label": {
            "fr": "Activité ou produit à présenter",
            "en": "Business or product to feature"
          },
          "kind": "text",
          "required": true,
          "placeholder": {
            "fr": "Ex : boulangerie, application, collection de vêtements…",
            "en": "e.g. bakery, app, clothing collection…"
          }
        },
        {
          "name": "style",
          "label": {
            "fr": "Style souhaité",
            "en": "Preferred style"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : premium, minimaliste, dynamique…",
            "en": "e.g. premium, minimalist, dynamic…"
          }
        },
        {
          "name": "duree",
          "label": {
            "fr": "Durée souhaitée",
            "en": "Preferred duration"
          },
          "kind": "slider",
          "required": false,
          "slider": {
            "min": 10,
            "max": 30,
            "step": 5,
            "default": 20
          },
          "default": "20",
          "role": "duree"
        },
        {
          "name": "resolution",
          "label": {
            "fr": "Résolution souhaitée",
            "en": "Preferred resolution"
          },
          "kind": "select",
          "required": false,
          "options": [
            {
              "value": "360p",
              "label": {
                "fr": "360p",
                "en": "360p"
              }
            },
            {
              "value": "720p",
              "label": {
                "fr": "720p",
                "en": "720p"
              }
            }
          ],
          "default": "720p",
          "role": "resolution"
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
            }
          ],
          "default": "horizontal",
          "role": "format"
        }
      ]
    },
    {
      "key": "montage",
      "nom": {
        "fr": "Montage vidéo",
        "en": "Video editing"
      },
      "description": {
        "fr": "Vous avez déjà vos vidéos ou vos plans ? Nous les montons pour vos réseaux sociaux ou pour une publicité.",
        "en": "Already have your footage? We edit it for social media or for an ad."
      },
      "points": [
        {
          "fr": "Réseaux sociaux : Reels, TikTok, Shorts, Stories",
          "en": "Social media: Reels, TikTok, Shorts, Stories"
        },
        {
          "fr": "Publicités à partir de vos propres plans",
          "en": "Ads built from your own footage"
        },
        {
          "fr": "Rythme, sous-titres et son selon votre brief",
          "en": "Pacing, subtitles and sound to match your brief"
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
                "fr": "Publicité",
                "en": "Advertisement"
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
            "fr": "Ex : Reel dynamique avec sous-titres, pub à partir de nos plans…",
            "en": "e.g. dynamic Reel with subtitles, ad built from our shots…"
          }
        }
      ]
    },
    {
      "key": "logo",
      "nom": {
        "fr": "Création de logo",
        "en": "Logo creation"
      },
      "description": {
        "fr": "Un logo pour votre marque, seul ou avec votre publicité vidéo.",
        "en": "A logo for your brand, on its own or together with your video ad."
      },
      "points": [
        {
          "fr": "Seul, ou en option avec une publicité vidéo",
          "en": "On its own, or as an option with a video ad"
        },
        {
          "fr": "Pensé pour votre marque et votre secteur",
          "en": "Designed for your brand and your industry"
        },
        {
          "fr": "Livrables définis ensemble avant de commencer",
          "en": "Deliverables agreed together before we start"
        }
      ],
      "icon": "pen",
      "requiresBrand": true,
      "aiNotice": false,
      "questions": [
        {
          "name": "style_logo",
          "label": {
            "fr": "Style du logo souhaité",
            "en": "Preferred logo style"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : minimaliste, moderne, élégant…",
            "en": "e.g. minimalist, modern, elegant…"
          }
        },
        {
          "name": "couleurs",
          "label": {
            "fr": "Couleurs",
            "en": "Colours"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : noir et or",
            "en": "e.g. black and gold"
          }
        },
        {
          "name": "inspirations",
          "label": {
            "fr": "Inspirations éventuelles",
            "en": "Inspirations (optional)"
          },
          "kind": "long",
          "required": false,
          "placeholder": {
            "fr": "Logos ou marques qui vous plaisent, liens…",
            "en": "Logos or brands you like, links…"
          }
        },
        {
          "name": "utilisation",
          "label": {
            "fr": "Utilisation prévue",
            "en": "Intended use"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : réseaux sociaux, packaging, site web…",
            "en": "e.g. social media, packaging, website…"
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
          "fr": "Salons, catégories et rôles structurés",
          "en": "Structured channels, categories and roles"
        },
        {
          "fr": "Règles, accueil et permissions configurés",
          "en": "Rules, welcome and permissions set up"
        },
        {
          "fr": "Bots, panels et tickets selon vos besoins",
          "en": "Bots, panels and tickets according to your needs"
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
        },
        {
          "name": "besoins_graphiques",
          "label": {
            "fr": "Besoins graphiques",
            "en": "Graphic needs"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : icône, bannière…",
            "en": "e.g. icon, banner…"
          },
          "skipIfServices": [
            "logo"
          ]
        }
      ]
    }
  ],
  "formules": [
    {
      "key": "pub",
      "nom": {
        "fr": "Publicité seule",
        "en": "Video ad"
      },
      "description": {
        "fr": "Une publicité vidéo.",
        "en": "A video ad."
      },
      "services": [
        "pub"
      ],
      "requiresBrand": false,
      "questions": [
        {
          "name": "objectif",
          "label": {
            "fr": "Objectif de la publicité",
            "en": "Goal of the ad"
          },
          "kind": "long",
          "required": true,
          "placeholder": {
            "fr": "Ex : lancer un produit, faire connaître la marque…",
            "en": "e.g. launch a product, build brand awareness…"
          }
        },
        {
          "name": "produit",
          "label": {
            "fr": "Activité ou produit à présenter",
            "en": "Business or product to feature"
          },
          "kind": "text",
          "required": true,
          "placeholder": {
            "fr": "Ex : boulangerie, application, collection de vêtements…",
            "en": "e.g. bakery, app, clothing collection…"
          }
        },
        {
          "name": "style",
          "label": {
            "fr": "Style souhaité",
            "en": "Preferred style"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : premium, minimaliste, dynamique…",
            "en": "e.g. premium, minimalist, dynamic…"
          }
        },
        {
          "name": "duree",
          "label": {
            "fr": "Durée souhaitée",
            "en": "Preferred duration"
          },
          "kind": "slider",
          "required": false,
          "slider": {
            "min": 10,
            "max": 30,
            "step": 5,
            "default": 20
          },
          "default": "20",
          "role": "duree"
        },
        {
          "name": "resolution",
          "label": {
            "fr": "Résolution souhaitée",
            "en": "Preferred resolution"
          },
          "kind": "select",
          "required": false,
          "options": [
            {
              "value": "360p",
              "label": {
                "fr": "360p",
                "en": "360p"
              }
            },
            {
              "value": "720p",
              "label": {
                "fr": "720p",
                "en": "720p"
              }
            }
          ],
          "default": "720p",
          "role": "resolution"
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
            }
          ],
          "default": "horizontal",
          "role": "format"
        }
      ]
    },
    {
      "key": "logo",
      "nom": {
        "fr": "Logo seul",
        "en": "Logo only"
      },
      "description": {
        "fr": "La création d'un logo.",
        "en": "A logo creation."
      },
      "services": [
        "logo"
      ],
      "requiresBrand": true,
      "questions": [
        {
          "name": "style_logo",
          "label": {
            "fr": "Style du logo souhaité",
            "en": "Preferred logo style"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : minimaliste, moderne, élégant…",
            "en": "e.g. minimalist, modern, elegant…"
          }
        },
        {
          "name": "couleurs",
          "label": {
            "fr": "Couleurs",
            "en": "Colours"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : noir et or",
            "en": "e.g. black and gold"
          }
        },
        {
          "name": "inspirations",
          "label": {
            "fr": "Inspirations éventuelles",
            "en": "Inspirations (optional)"
          },
          "kind": "long",
          "required": false,
          "placeholder": {
            "fr": "Logos ou marques qui vous plaisent, liens…",
            "en": "Logos or brands you like, links…"
          }
        },
        {
          "name": "utilisation",
          "label": {
            "fr": "Utilisation prévue",
            "en": "Intended use"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : réseaux sociaux, packaging, site web…",
            "en": "e.g. social media, packaging, website…"
          }
        }
      ]
    },
    {
      "key": "pub_logo",
      "nom": {
        "fr": "Publicité + logo",
        "en": "Video ad + logo"
      },
      "description": {
        "fr": "Une publicité vidéo et la création de votre logo.",
        "en": "A video ad and your logo creation."
      },
      "services": [
        "pub",
        "logo"
      ],
      "requiresBrand": true,
      "questions": [
        {
          "name": "objectif",
          "label": {
            "fr": "Objectif de la publicité",
            "en": "Goal of the ad"
          },
          "kind": "long",
          "required": true,
          "placeholder": {
            "fr": "Ex : lancer un produit, faire connaître la marque…",
            "en": "e.g. launch a product, build brand awareness…"
          }
        },
        {
          "name": "produit",
          "label": {
            "fr": "Activité ou produit à présenter",
            "en": "Business or product to feature"
          },
          "kind": "text",
          "required": true,
          "placeholder": {
            "fr": "Ex : boulangerie, application, collection de vêtements…",
            "en": "e.g. bakery, app, clothing collection…"
          }
        },
        {
          "name": "style",
          "label": {
            "fr": "Style souhaité",
            "en": "Preferred style"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : premium, minimaliste, dynamique…",
            "en": "e.g. premium, minimalist, dynamic…"
          }
        },
        {
          "name": "duree",
          "label": {
            "fr": "Durée souhaitée",
            "en": "Preferred duration"
          },
          "kind": "slider",
          "required": false,
          "slider": {
            "min": 10,
            "max": 30,
            "step": 5,
            "default": 20
          },
          "default": "20",
          "role": "duree"
        },
        {
          "name": "resolution",
          "label": {
            "fr": "Résolution souhaitée",
            "en": "Preferred resolution"
          },
          "kind": "select",
          "required": false,
          "options": [
            {
              "value": "360p",
              "label": {
                "fr": "360p",
                "en": "360p"
              }
            },
            {
              "value": "720p",
              "label": {
                "fr": "720p",
                "en": "720p"
              }
            }
          ],
          "default": "720p",
          "role": "resolution"
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
            }
          ],
          "default": "horizontal",
          "role": "format"
        },
        {
          "name": "style_logo",
          "label": {
            "fr": "Style du logo souhaité",
            "en": "Preferred logo style"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : minimaliste, moderne, élégant…",
            "en": "e.g. minimalist, modern, elegant…"
          }
        },
        {
          "name": "couleurs",
          "label": {
            "fr": "Couleurs",
            "en": "Colours"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : noir et or",
            "en": "e.g. black and gold"
          }
        },
        {
          "name": "inspirations",
          "label": {
            "fr": "Inspirations éventuelles",
            "en": "Inspirations (optional)"
          },
          "kind": "long",
          "required": false,
          "placeholder": {
            "fr": "Logos ou marques qui vous plaisent, liens…",
            "en": "Logos or brands you like, links…"
          }
        },
        {
          "name": "utilisation",
          "label": {
            "fr": "Utilisation prévue",
            "en": "Intended use"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : réseaux sociaux, packaging, site web…",
            "en": "e.g. social media, packaging, website…"
          }
        }
      ]
    },
    {
      "key": "montage",
      "nom": {
        "fr": "Montage seul",
        "en": "Editing only"
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
                "fr": "Publicité",
                "en": "Advertisement"
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
            "fr": "Ex : Reel dynamique avec sous-titres, pub à partir de nos plans…",
            "en": "e.g. dynamic Reel with subtitles, ad built from our shots…"
          }
        }
      ]
    },
    {
      "key": "discord",
      "nom": {
        "fr": "Discord seul",
        "en": "Discord only"
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
        },
        {
          "name": "besoins_graphiques",
          "label": {
            "fr": "Besoins graphiques",
            "en": "Graphic needs"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : icône, bannière…",
            "en": "e.g. icon, banner…"
          },
          "skipIfServices": [
            "logo"
          ]
        }
      ]
    },
    {
      "key": "discord_logo",
      "nom": {
        "fr": "Discord + logo",
        "en": "Discord + logo"
      },
      "description": {
        "fr": "Votre serveur Discord et son identité visuelle.",
        "en": "Your Discord server and its visual identity."
      },
      "services": [
        "discord",
        "logo"
      ],
      "requiresBrand": true,
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
        },
        {
          "name": "style_logo",
          "label": {
            "fr": "Style du logo souhaité",
            "en": "Preferred logo style"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : minimaliste, moderne, élégant…",
            "en": "e.g. minimalist, modern, elegant…"
          }
        },
        {
          "name": "couleurs",
          "label": {
            "fr": "Couleurs",
            "en": "Colours"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : noir et or",
            "en": "e.g. black and gold"
          }
        },
        {
          "name": "inspirations",
          "label": {
            "fr": "Inspirations éventuelles",
            "en": "Inspirations (optional)"
          },
          "kind": "long",
          "required": false,
          "placeholder": {
            "fr": "Logos ou marques qui vous plaisent, liens…",
            "en": "Logos or brands you like, links…"
          }
        },
        {
          "name": "utilisation",
          "label": {
            "fr": "Utilisation prévue",
            "en": "Intended use"
          },
          "kind": "text",
          "required": false,
          "placeholder": {
            "fr": "Ex : réseaux sociaux, packaging, site web…",
            "en": "e.g. social media, packaging, website…"
          }
        }
      ]
    }
  ]
} as PublicCatalogue;
