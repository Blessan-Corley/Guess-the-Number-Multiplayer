# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - heading "Number Guesser" [level=1] [ref=e4]
    - main [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - img [ref=e9]
          - heading "Welcome to the Number Guessing Challenge!" [level=2] [ref=e11]
          - paragraph [ref=e12]: Challenge your friends or play against our smart AI bot.
          - link "How to Play" [ref=e14] [cursor=pointer]:
            - /url: "#"
            - img [ref=e15]
            - text: How to Play
        - generic [ref=e17]:
          - generic [ref=e18]: Your Name
          - textbox "Your Name" [active] [ref=e19]:
            - /placeholder: Enter your name
            - text: SoloPlayer
        - generic [ref=e20]:
          - heading "Choose Game Mode" [level=3] [ref=e21]
          - generic [ref=e22]:
            - button "Single Player" [ref=e23] [cursor=pointer]:
              - img [ref=e24]
              - text: Single Player
            - button "Multiplayer" [ref=e27] [cursor=pointer]:
              - img [ref=e28]
              - text: Multiplayer
  - generic "Connected to server" [ref=e33]: Connected
  - alert:
    - generic [ref=e34]:
      - img [ref=e36]
      - generic [ref=e38]: An unexpected error occurred. Please try refreshing the page.
      - button "Close notification" [ref=e39] [cursor=pointer]:
        - img [ref=e40]
```