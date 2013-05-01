calendar-appts
==============

Write a logic to layout a series of appointments on the calendar for a single day.
With 2 major constraints:
- Overlapping appointments needs to be the same width as the appointments its colliding with.
- An appointment should use the maximum width possible while honoring the first constraint.

Solution:

LOGIC =>

Input: Appointment JSON sorted by start date.
Process: For each appointment:
Find all the overlapping appointments
Calculate the column of each appointment
Find all the overlapping appointments to the right of a given appointment
Find max column for each appointment
Output: appointment populated with position column, max column and overlapping appointments.


UI =>

Build UI: Setup base UI with time-slots with a given height and width.
Position: Compute appointment dimensions
Compute width for each appointment by expanding & filling overlapping columns
Calculate top, left, height & width for each appointment.
Render: Layout the appointments absolute.


TEST =>

Textbox for user to enter test data ( sorted by start time )
Links to easily populate test data.
Generate button to generate the corresponding day view.

<img src="http://www.rajeshsegu.com/wp-content/uploads/2012/07/Calendar_Screenshot.png"/>
<img src="http://www.rajeshsegu.com/wp-content/uploads/2012/07/Calendar_Test.png"/>
 


