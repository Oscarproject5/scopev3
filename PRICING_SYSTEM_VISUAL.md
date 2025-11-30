# ScopeGuard Pricing System - Visual Guide

## Complete Request-to-Quote Flow

```
                                    CLIENT JOURNEY
    ================================================================================

    [1. SUBMIT REQUEST]
           |
           v
    +------------------+
    |  Request Portal  |
    |  - Name/Email    |
    |  - Description   |
    +------------------+
           |
           v
    [2. AI GENERATES QUESTIONS]
           |
           v
    +---------------------------+
    |  Clarification Questions  |
    |  (3-4 targeted questions) |
    |  - Text inputs            |
    |  - Select dropdowns       |
    +---------------------------+
           |
           v
    [3. CLIENT ANSWERS]
           |
           v
    +---------------------------+
    |   AGENTIC PRICING ENGINE  |
    |   (Full AI Analysis)      |
    +---------------------------+
           |
           +---> [Gather Context] ---> [Market Research] ---> [Calculate Price]
           |
           v
    +---------------------------+
    |      SCOPE VERDICT        |
    +---------------------------+
           |
           +----------+----------+----------+
           |          |          |          |
           v          v          v          v
       IN_SCOPE   OUT_OF_SCOPE  PENDING   NEEDS_CLARIFICATION
       (Free!)    (Add-on $$$)  REVIEW    (More questions)
```

---

## Decision Tree: Auto-Approve vs Manual Review

```
                        REQUEST WITH ANSWERS SUBMITTED
                                    |
                                    v
                    +-------------------------------+
                    |  project.requireApproval = ?  |
                    +-------------------------------+
                           |                |
                      FALSE |                | TRUE
                           |                |
                           v                v
              +-------------------+    +------------------------+
              |   AUTO-APPROVE    |    |    MANUAL REVIEW       |
              |   FLOW (Path A)   |    |    FLOW (Path B)       |
              +-------------------+    +------------------------+
                      |                         |
                      v                         v
              +-------------------+    +------------------------+
              | AI calculates     |    | Save as pending_review |
              | price with full   |    | Freelancer sees in     |
              | breakdown         |    | dashboard              |
              +-------------------+    +------------------------+
                      |                         |
                      v                         v
              +-------------------+    +------------------------+
              | Status:           |    | Status:                |
              | pending_client_   |    | pending_freelancer_    |
              | approval          |    | approval               |
              +-------------------+    +------------------------+
                      |                         |
                      v                         v
              +-------------------+    +------------------------+
              | CLIENT SEES:      |    | FREELANCER REVIEWS:    |
              | - Price quote     |    | - Request details      |
              | - Breakdown       |    | - AI analysis          |
              | - Approve/Decline |    | - Sets final price     |
              +-------------------+    +------------------------+
                      |                         |
                      v                         v
              [Client Decision]         [Sends quote to client]
```

---

## Agentic Pricing Engine - Internal Flow

```
    +===========================================================================+
    |                        AGENTIC PRICING ENGINE                              |
    +===========================================================================+

    STEP 1: GATHER CONTEXT
    +------------------+     +------------------+     +------------------+
    |   FREELANCER     |     |     PROJECT      |     |     REQUEST      |
    |   CONTEXT        |     |     CONTEXT      |     |     CONTEXT      |
    +------------------+     +------------------+     +------------------+
    | - Location       |     | - Contract price |     | - Description    |
    | - Hourly rate    |     | - Project type   |     | - Client answers |
    | - Specializations|     | - Timeline       |     | - Complexity     |
    | - Positioning    |     | - Client location|     |                  |
    | - Tier level     |     | - Deliverables   |     |                  |
    +------------------+     +------------------+     +------------------+
            |                        |                        |
            +------------------------+------------------------+
                                     |
                                     v
    STEP 2: MARKET RESEARCH
    +-----------------------------------------------------------------------+
    |                         GPT-4o ANALYSIS                                |
    +-----------------------------------------------------------------------+
    |  Search: "What do [specialists] in [location] charge for [work type]?"|
    |                                                                        |
    |  Returns:                                                              |
    |  - Rate ranges (low/mid/high)                                         |
    |  - Market insights                                                     |
    |  - Typical pricing for similar scope changes                          |
    +-----------------------------------------------------------------------+
                                     |
                                     v
    STEP 3: CALCULATE PRICE
    +-----------------------------------------------------------------------+
    |                      THREE PRICING LENSES                              |
    +-----------------------------------------------------------------------+
    |                                                                        |
    |   COST-BASED            VALUE-BASED           MARKET-BASED            |
    |   +-----------+         +-----------+         +-----------+           |
    |   | Hours x   |         | What's it |         | Current   |           |
    |   | Rate +    |         | worth to  |         | market    |           |
    |   | Overhead +|         | client?   |         | rates     |           |
    |   | Profit    |         |           |         |           |           |
    |   +-----------+         +-----------+         +-----------+           |
    |        |                      |                     |                 |
    |        +----------------------+---------------------+                 |
    |                               |                                       |
    |                               v                                       |
    |                    WEIGHTED RECOMMENDATION                            |
    +-----------------------------------------------------------------------+
                                     |
                                     v
    OUTPUT: PRICE BREAKDOWN
    +-----------------------------------------------------------------------+
    |  Estimated Hours:     X hours (conservative)                          |
    |  Hourly Rate:         $Y/hr                                           |
    |  Labor Cost:          $Z (hours x rate)                               |
    |  + Overhead:          +20%                                            |
    |  + Profit Margin:     +15%                                            |
    |  = Base Subtotal:     $XXX                                            |
    |  x Market Adjustment: 1.0-1.3x                                        |
    |  + Safety Buffer:     15-25%                                          |
    |  ===================================                                  |
    |  RECOMMENDED PRICE:   $XXX.XX                                         |
    |  Price Range:         $min - $max                                     |
    |  Confidence:          XX%                                             |
    +-----------------------------------------------------------------------+
```

---

## Tier System & Buffer Reduction

```
    TIER PROGRESSION
    ================================================================================

    TIER 1                TIER 2                TIER 3                TIER 4
    (0 projects)          (10+ projects)        (30+ projects)        (50+ projects)

    +-------------+       +-------------+       +-------------+       +-------------+
    |   LEARNING  |  -->  |   GROWING   |  -->  |  ESTABLISHED|  -->  |    EXPERT   |
    +-------------+       +-------------+       +-------------+       +-------------+

    Auto-Approve:         Auto-Approve:         Auto-Approve:         Auto-Approve:
    NEVER                 < $2K @ 75%+          < $5K @ 85%+          < $10K @ 90%+

    Buffer:               Buffer:               Buffer:               Buffer:
    100% (full)           70-85%                35-50%                10-20%


    BUFFER REDUCTION SCHEDULE
    ================================================================================

    Projects    Buffer        Status
    Completed   Multiplier
    ---------   ----------    ------------------------------------------------
        0         1.00x       Zero data - maximum protection
        3         0.85x       Early patterns forming
        6         0.70x       Moderate confidence in estimates
       10         0.50x       Historical data available
       20         0.35x       Pattern recognition improving
       30         0.20x       ML training active
       50         0.10x       Full automation (industry standard only)


    INDUSTRY BASE BUFFERS (before tier multiplier)
    ================================================================================

                          Simple    Moderate    Complex
                          ------    --------    -------
    Software Dev           25%        35%         50%
    Design/Creative        30%        40%         55%
    Construction           15%        25%         40%
    Consulting             20%        30%         45%
    Marketing              25%        35%         50%
    Writing/Content        20%        30%         45%

    EXAMPLE:
    Software dev, moderate complexity, Tier 1 with 3 projects:
    Final Buffer = 35% base x 0.85 tier multiplier = 29.75%
```

---

## Client UI States

```
    RESULT SCREEN VARIANTS
    ================================================================================


    A) IN SCOPE - Included in Package
    +------------------------------------------------------------------+
    |  [checkmark icon]                                                 |
    |                                                                   |
    |  INCLUDED IN YOUR PACKAGE                                         |
    |  "3 revisions remaining"                                          |
    |                                                                   |
    |  Analysis: This request falls within your contracted scope...     |
    |                                                                   |
    |  +------------------------------------------------------------+  |
    |  |  [checkmark] You're All Set!                               |  |
    |  |  [freelancer] has been notified.                           |  |
    |  |                                                             |  |
    |  |  [ Submit Another Request ]                                 |  |
    |  +------------------------------------------------------------+  |
    +------------------------------------------------------------------+


    B) OUT OF SCOPE - Add-on with Price (Auto-Approved)
    +------------------------------------------------------------------+
    |  [$$ icon]                                                        |
    |                                                                   |
    |  ADD-ON REQUIRED                                                  |
    |  $350.00  (5 hrs @ $70/hr)                                        |
    |                                                                   |
    |  +------------------------------------------------------------+  |
    |  |  PRICE BREAKDOWN                                           |  |
    |  |  Estimated Time: 5 hours                                   |  |
    |  |  Complexity: Moderate                                      |  |
    |  |  Price Range: $280 - $420                                  |  |
    |  |  Confidence: [==========>--------] 78%                     |  |
    |  +------------------------------------------------------------+  |
    |                                                                   |
    |  Analysis: This request requires work outside your package...     |
    |                                                                   |
    |  +------------------------------------------------------------+  |
    |  |  How would you like to proceed?                            |  |
    |  |                                                             |  |
    |  |  [ Approve & Start Work ]    [ Cancel Request ]            |  |
    |  +------------------------------------------------------------+  |
    +------------------------------------------------------------------+


    C) UNDER REVIEW - Manual Approval Required
    +------------------------------------------------------------------+
    |  [clock icon]                                                     |
    |                                                                   |
    |  UNDER REVIEW                                                     |
    |  [freelancer] is reviewing your request and will send             |
    |  you a quote soon.                                                |
    |                                                                   |
    |  +------------------------------------------------------------+  |
    |  |  [clock] What Happens Next?                                |  |
    |  |  They will review your request, determine scope,           |  |
    |  |  and send you a link to proceed.                           |  |
    |  |                                                             |  |
    |  |  [ Submit Another Request ]                                 |  |
    |  +------------------------------------------------------------+  |
    +------------------------------------------------------------------+
```

---

## Settings That Control Pricing Behavior

```
    PROJECT-LEVEL SETTINGS
    ================================================================================

    +---------------------------+-----------------------------------------------+
    |  requireApproval          |  FALSE = Auto-price to client                 |
    |                           |  TRUE = Freelancer reviews first              |
    +---------------------------+-----------------------------------------------+
    |  hourlyRate               |  Base rate for out-of-scope calculations      |
    +---------------------------+-----------------------------------------------+
    |  deliverables             |  What's IN scope (affects verdict)            |
    +---------------------------+-----------------------------------------------+
    |  revisionsIncluded        |  How many revisions before charging           |
    +---------------------------+-----------------------------------------------+
    |  originalContractPrice    |  Reference for scope-relative pricing         |
    +---------------------------+-----------------------------------------------+
    |  projectType              |  "website", "app", "design" - affects rates   |
    +---------------------------+-----------------------------------------------+


    USER/FREELANCER SETTINGS
    ================================================================================

    +---------------------------+-----------------------------------------------+
    |  hourlyRate               |  Default rate for calculations                |
    +---------------------------+-----------------------------------------------+
    |  currentTier              |  1-4, controls auto-approve thresholds        |
    +---------------------------+-----------------------------------------------+
    |  projectsCompleted        |  Reduces buffer over time                     |
    +---------------------------+-----------------------------------------------+
    |  industry                 |  Determines base buffer percentages           |
    +---------------------------+-----------------------------------------------+
    |  competitivePositioning   |  "budget" / "mid-market" / "premium"          |
    +---------------------------+-----------------------------------------------+
    |  location                 |  Used for market rate research                |
    +---------------------------+-----------------------------------------------+
    |  specializations          |  Skills for targeted rate research            |
    +---------------------------+-----------------------------------------------+
```

---

## Quick Reference: Status Flow

```
    REQUEST STATUSES
    ================================================================================

    pending_questions -----> Client hasn't answered clarification questions yet
           |
           v
    pending_freelancer_approval --> Freelancer needs to review & set price
           |
           v
    pending_client_approval ------> Client sees price, can approve/decline
           |
           +-----------------+
           |                 |
           v                 v
       approved           declined
           |
           v
         paid
           |
           v
       completed


    VERDICT TYPES
    ================================================================================

    in_scope -----------> Work included in existing contract (free)
    out_of_scope -------> Additional work, requires payment
    pending_review -----> AI unsure, needs human decision
    needs_clarification -> Request unclear, ask more questions
```

---

## Summary: The Two Main Flows

```
    ================================================================================
                              AUTOMATIC PRICING FLOW
                         (requireApproval = false)
    ================================================================================

    Client Request --> Questions --> Answers --> AI Prices --> CLIENT SEES PRICE
                                                                     |
                                                              [Approve/Decline]


    ================================================================================
                               MANUAL REVIEW FLOW
                          (requireApproval = true)
    ================================================================================

    Client Request --> Questions --> Answers --> "Under Review" --> FREELANCER
                                                                        |
                                                               [Reviews & Prices]
                                                                        |
                                                                        v
                                                              Client gets quote link
```
