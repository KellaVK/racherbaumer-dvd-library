/**
 * DVD seed data — compiled from the Racherbaumer spreadsheet.
 *
 * This covers the rows visible in the Master List Order tab and the
 * Additions to OG_LIST tab. Export the full "Master List Order" sheet
 * as CSV and run the CSV importer (see README) to load all ~178 DVDs.
 *
 * Fields:
 *   title         — DVD title
 *   magician      — performer(s), separated by ; for multiples
 *   notes         — contents / description
 *   magicType     — type tags, separated by ;
 *   producer      — production company
 *   otherFeatures — additional performers / extras
 */

export const dvdData = [
  // ── MASTER LIST ORDER (A–C) ──────────────────────────────────────────────
  { title: "Optical Delusion",                              magician: "Aaron Paterson",                     magicType: "",              notes: "",                                             producer: "" },
  { title: "Restaurant Magic - Vol.1",                      magician: "Alain Iannone",                      magicType: "",              notes: "",                                             producer: "" },
  { title: "Three Ring Concerto",                           magician: "Aldo Colombini",                     magicType: "",              notes: "",                                             producer: "" },
  { title: "A Material",                                    magician: "Allan Ackerman",                     magicType: "",              notes: "",                                             producer: "" },
  { title: "The Magic of John Ramsay - Vol.2",              magician: "Andrew Galloway; John Ramsay",       magicType: "",              notes: "",                                             producer: "" },
  { title: "Tribute",                                       magician: "Ben Train",                          magicType: "",              notes: "",                                             producer: "" },
  { title: "Bill Malone - CEO of Comedy Magic",             magician: "Bill Malone",                        magicType: "",              notes: "",                                             producer: "" },
  { title: "On The Loose - Vol.3",                          magician: "Bill Malone",                        magicType: "",              notes: "",                                             producer: "" },
  { title: "On The Loose - Vol.4",                          magician: "Bill Malone",                        magicType: "",              notes: "",                                             producer: "" },
  { title: "Bob Read - International Magic",                magician: "Bob Read",                           magicType: "",              notes: "",                                             producer: "" },
  { title: "The Impromptu Miracles of Bob Read",            magician: "Bob Read",                           magicType: "",              notes: "",                                             producer: "" },
  { title: "The Shell Game Series - Vol. 2",                magician: "Bob Sheets",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "Dice Routine - It's the Rules",                 magician: "Bob Sheets",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "Bob Does Hospitality",                          magician: "Bob Sheets",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "3 Shell Routine - Absolutely Nuts",             magician: "Bob Sheets",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "Grab That Pinhead",                             magician: "Bob Sheets; Dan Garrett",            magicType: "",              notes: "",                                             producer: "" },
  { title: "Malini Egg Bag",                                magician: "Bob White",                          magicType: "",              notes: "",                                             producer: "" },
  { title: "Torn and Restored Tissue",                      magician: "Bob White",                          magicType: "",              notes: "",                                             producer: "" },
  { title: "The Greater Magic Video Library - Vol.23",      magician: "Bobo",                               magicType: "",              notes: "",                                             producer: "" },
  { title: "Remarkable Coin Magic",                         magician: "Boris Wild",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "WPT - Wild Poker Trick",                        magician: "Boris Wild",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "Show Off 3 - King of Cards",                    magician: "Brian Tudor",                        magicType: "",              notes: "",                                             producer: "" },
  { title: "Rematch",                                       magician: "Caleb Wiles",                        magicType: "",              notes: "",                                             producer: "" },

  // ── MASTER LIST ORDER (M–R, bottom of list) ─────────────────────────────
  { title: "Encyclopedia of Coin Sleights Vol. 2",          magician: "Michael Rubinstein",                 magicType: "Moves",         notes: "",                                             producer: "" },
  { title: "Encyclopedia of Coin Sleights Vol. 3",          magician: "Michael Rubinstein",                 magicType: "Moves",         notes: "",                                             producer: "" },
  { title: "Rhapsodies in Silver and Other Mysteries",      magician: "Michael Vincent",                    magicType: "",              notes: "",                                             producer: "" },
  { title: "The Classic Magic of Michael Vincent",          magician: "Michael Vincent",                    magicType: "",              notes: "",                                             producer: "" },
  { title: "Mike Caveney - His Aim is Comedy",              magician: "Mike Caveney",                       magicType: "",              notes: "",                                             producer: "" },
  { title: "The Magic of Mike Gallo Vol.2",                 magician: "Mike Gallo",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "Kranzo's Extreme Magic Seminar",                magician: "Nathan Kranzo",                      magicType: "",              notes: "",                                             producer: "" },
  { title: "Mene Tekel Miracles",                           magician: "Nathan Kranzo",                      magicType: "",              notes: "",                                             producer: "" },
  { title: "Burning Up",                                    magician: "Nathan Kranzo",                      magicType: "",              notes: "",                                             producer: "" },
  { title: "The Grumble Glim",                              magician: "Nathan Kranzo",                      magicType: "",              notes: "",                                             producer: "" },
  { title: "A Weekend At 4F - Vol.1",                       magician: "Obie O'Brien",                       magicType: "",              notes: "",                                             producer: "" },
  { title: "Extortion",                                     magician: "Patrick Kun",                        magicType: "",              notes: "",                                             producer: "" },
  { title: "Paul Harris - Technology Mastery and Astonishment", magician: "Paul Harris",                   magicType: "",              notes: "",                                             producer: "" },
  { title: "Stars of Magic",                                magician: "Paul Harris",                        magicType: "",              notes: "",                                             producer: "" },
  { title: "Penn & Teller - B.S.!",                         magician: "Penn and Teller",                    magicType: "",              notes: "",                                             producer: "" },
  { title: "Freeform Mentalism",                            magician: "Peter Turner",                       magicType: "Mentalism",     notes: "",                                             producer: "" },
  { title: "Crowd Puller",                                  magician: "Peter Wardell",                      magicType: "",              notes: "",                                             producer: "" },
  { title: "Perform Like a Pro",                            magician: "Quentin Reynolds",                   magicType: "",              notes: "",                                             producer: "" },
  { title: "Close-Up Artistry - Vol.5",                     magician: "Rene Lavand",                        magicType: "",              notes: "",                                             producer: "" },
  { title: "Chip Tricks Vol.1",                             magician: "Rich Ferguson",                      magicType: "",              notes: "",                                             producer: "" },
  { title: "On the Pass",                                   magician: "Richard Kaufman",                    magicType: "",              notes: "",                                             producer: "" },
  { title: "Super Cards",                                   magician: "Richard Sanders",                    magicType: "",              notes: "",                                             producer: "" },
  { title: "Richard Turner - Making Magic from Adversity",  magician: "Richard Turner",                     magicType: "",              notes: "",                                             producer: "" },

  // ── ADDITIONS TO OG_LIST (richer metadata) ───────────────────────────────
  { title: "Magic Farm",                                    magician: "David Williamson",                   magicType: "Master Class",  notes: "Williamson Masterclass",                       producer: "David Williamson Productions" },
  { title: "A Master of Muscle Pass",                       magician: "Shoot Ogawa",                        magicType: "Moves",         notes: "Various Coin Moves",                           producer: "" },
  { title: "Busters 2",                                     magician: "Shoot Ogawa",                        magicType: "Effects",       notes: "Various Coin Effects",                         producer: "" },
  { title: "Terry Roses, John Scarne, Luiz Zingone",        magician: "Terry Roses; John Scarne; Luiz Zingone", magicType: "",          notes: "",                                             producer: "Terry Roses, John Scarne, Luiz Zingone", otherFeatures: "" },
  { title: "Visu-antics: Eye Popping Magic",                magician: "Jim Paces",                          magicType: "Pace Masterclass", notes: "Pace Masterclass; Various Effects",         producer: "" },
  { title: "The Movie: Tricks and Fiction from the Road",   magician: "The Flicking Fingers",               magicType: "Masterclass",   notes: "Flicking Fingers Masterclass",                 producer: "The Flicking Fingers" },
  { title: "Magic on Stage - McBride - Vol.3",              magician: "Jeff McBride",                       magicType: "Masterclass",   notes: "McBride Masterclass",                          producer: "" },
  { title: "Expert Card Magic - Lecture Notes - Vol.1",     magician: "Sal Piacente",                       magicType: "Effects",       notes: "Cards Galore; Two Copies",                     producer: "Magic Makers Inc." },
  { title: "Expert Card Magic - Lecture Notes - Vol.2",     magician: "Sal Piacente",                       magicType: "Effects",       notes: "Cards Galore; Two Copies",                     producer: "Magic Makers Inc." },
  { title: "Live at the Jailhouse: A Guide to Restaurant Magic", magician: "Various",                       magicType: "Effects; Gig Garnering", notes: "Restaurant/Walkaround Magic; Getting Gigs", producer: "Kozmo Magic", otherFeatures: "Dan Fleshman; Garrett Thomas" },
  { title: "Wanted! The Outlaw Magic of Lonnie Chevrie",    magician: "Lonnie Chevrie",                     magicType: "Masterclass",   notes: "Chevrie Masterclass",                          producer: "Magic Man 1234 Productions" },
  { title: "Richiaridi",                                    magician: "Dale Scott",                         magicType: "",              notes: "",                                             producer: "" },
  { title: "Under the Radar",                               magician: "Steve Reynolds",                     magicType: "Effects; Moves", notes: "Various Card effects, cover count, Zarrow shuffle", producer: "Steve Reynolds" },
  { title: "Magic",                                         magician: "Reed Michael Lucas",                 magicType: "Effects",       notes: "Various Effects performed in a bar setting",   producer: "Rotchford Productions" },
  { title: "The Science of Stacking and Shuffling",         magician: "Richard Turner",                     magicType: "Moves",         notes: "Various Shuffling and Stacking Techniques",    producer: "Showdown Creations Inc." },
  { title: "The Complete Introduction to Coin Magic",       magician: "Michael Ammar",                      magicType: "Moves; Effects", notes: "Coins Galore",                               producer: "L&L Publishing" },
  { title: "Cups and Balls: A Practical Approach",          magician: "Bob White",                          magicType: "Masterclass",   notes: "Everything Cups and Balls",                    producer: "Scapegrace Pictures" },
  { title: "It's So Simple - Fred Kaps Lecture",            magician: "Fred Kaps",                          magicType: "Masterclass",   notes: "Kaps Masterclass",                             producer: "Abracadabra" },
  { title: "Street Monte",                                  magician: "Sal Piacente",                       magicType: "Routine; Moves", notes: "3 Card Monte",                               producer: "Magic Makers Inc." },
  { title: "Shoot Force",                                   magician: "Shoot Ogawa; Masahiro Yanagida",     magicType: "Moves; Effects", notes: "Card Forces Galore",                         producer: "Wizards' Inn" },
  { title: "Skullkracker",                                  magician: "Bob Sheets",                         magicType: "Effect; Move",  notes: "Visual Bill Switch",                           producer: "Bob Kohler Productions" },
]

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO ADD THE REMAINING ~110 DVDs FROM YOUR SPREADSHEET:
//
// 1. In Google Sheets, open the "Master List Order" tab
// 2. File → Download → CSV (.csv)
// 3. Save the file as  scripts/dvds.csv
// 4. Run:  node scripts/seedFromCsv.js
//    (This script will read the CSV and merge with any existing Firestore docs)
// ─────────────────────────────────────────────────────────────────────────────
