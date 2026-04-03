# Onshape College Curriculum — 12-Week Lesson Plan

Extracted from official Onshape lesson PDFs.

============================================================
WEEK 1
============================================================
Week 1: Introduction to Onshape - “Getting 
Started”  
 
Concepts  
 ● Creating an Onshape account  
● Navigating a 3D environment  
● Explaining sketch -based modeling  
● Introducing the 4 foundational features (extrude, revolve, sweep, 
and loft)  
● Transitioning from 2D to 3D  
● Introducing basic sketching  
● Appendix A: keyboard shortcuts, mouse and touchpad gestures, 
view tools  
● Appendix B: navigating documents, account settings, 
subscription plans  
Models  ● Cylinder shell - used for intro to interface, visualization/viewing  
● Models that already have sketches - students must create 
features  
● Existing public models - search and copy to workspace  
 
 
 
  

 
Welcome to the Onshape College Curriculum  
Welcome! This curriculum is designed to introduce you to Computer -Aided Design (CAD) using 
the Onshape Full -Cloud CAD platform. This content has been created for use in a 12 -week 
course taught by an instructor at any college, university, or technical schoo l with a focus on 
design and engineering. This curriculum introduces you to not just CAD, but also to tried and 
true methods of designing products for manufacturing, as well as design techniques that are 
unique to Onshape and full -cloud CAD.  
Each week is d ivided into a Lesson Plan, Homework, and an Assessment. Instructors should 
feel free to modify this curriculum as they see fit to best deliver a valuable learning experience 
to their students.  
The core curriculum is a step -by-step walkthrough of most featu res in Onshape, with an equal 
focus on the “How” and the “Why.” After this course, you should be able to easily apply the skills 
learned to any other parametric CAD program and engineering setting. In addition to the 
instructions, there are also “Pro Tips”  which are designed to accompany some of the more 
advanced topics. Pro Tips  have been written from the perspective of a professional with the 
intent to quicken or clarify the design process.  
 
Let’s begin!  
 
Getting Started  
Before we start designing in Onsh ape, we need to create an account and sign in . 
 
Creating an Account  
Unlike most CAD software, you don’t have to download or install anything to use Onshape. But, 
you do have to create an account. Once you have an account, you can log into Onshape from 
any computer or mobile device as long as you have an internet connection. Follow the steps 
below to create your account:  
 
1. Open a browser window, and go to www.onshape.co m/signup  for the Free Plan, 
or go to www.onshape.com/edu/signup  to sign up for the free Education Plan 
(recommended for all teachers and students).  
2. Alternatively, go to www.onshape.com  and c lick the [Create Account] button at 
the top of the page . 
3. Answer a few questions and click [Create Free Account].  
4. Check your email for a confirmation email and follow the link within.  
5. You’re in!  
 
Signing In  
1. Navigate to  http://cad.onshape.com . 
2. Enter the email address you used during the


============================================================
WEEK 2
============================================================
Week 2: Introduction to 3D Modeling - Parts  
 
Concepts  
 ● An introduction to “Design Intent”  
● Using dimensions and constraints  
● Automatic inferencing  
● Making an accurate part  
● Sketching practice  
● Using and creating planes  
● Creating fillets and chamfers  
● Utilizing multiple sketch regions  
● Basic parts  
Models  ● Clock - used for lesson in design intent  
● Various simple geometric shapes  
 
 
 
 
 
 
 
 
 
  

 
Before We Get Started…  
Last week, we learned about the Onshape interface, sketch -based modeling, and the four 
foundational features. We made a bunch of sketches and parts but didn’t worry about how big 
they were or how the sketch entities related to one another. This is a great way to dip your feet 
into the ocean that is 3D CAD… but engineers like to be precise. This week, we will learn 
primarily about “design intent”, an important concept that allows designers and engineers to not 
only accurately create the parts they need, but also design their CAD models so that it is easy to 
make changes down the road.  
 
Design Intent  
In this section, we are going to build on what we’ve already learned about creating geometry in 
Onshape, and we are going to continue to use our 2D sketch>3D fea ture workflow. We are 
going to learn about “design intent” by way of using Sketch Constraints  and Dimensions . 
Finally, we are also going to start building more complex parts, by utilizing sketches with 
multiple Enclosed Regions . 
 
Most objects around us hav e parts and features with specific dimensions that relate in some 
way to one another. The designer purposefully made these decisions and relationships in order 
to execute their design the way they want it to. Design Intent  is the practice of developing you r 
project’s objectives and requirements even before working on your design. The more complex 
the geometry, the more we need to think about how we want to design the parts before just 
going ahead and making it.  
 
It might be easier to think about design int ent by reversing the words to “intended design”. Take 
an analog clock for example:  
 
 

What is its “intended design?” We could say that the clock has the following design 
requirements:  
A. The hands should always be located in the center of the clock, no matt er how short the 
hands may be.  
B. The numbers should always be equidistant from the center of the clock face, so if I move 
one of the numbers closer to the center, all the numbers should move closer.  
C. The numbers should always have the same height, so if I m ake one of the numbers 
bigger, the rest of the numbers should also become bigger.  
 
These kind of statements help define what the clock should look like. But how do we satisfy 
these design requirements in CAD? We learned that sketch -based modeling always i nvolve 2D 
sketches, so let’s look at some 2D sketches first.  
 
Dimensions & Constraints in 2D Geometry  
Design intent goes hand -in-hand with Dimensions  and Constr


============================================================
WEEK 3
============================================================
Week 3: 3D Modeling - Multi -Part Part Studio  
 
Concepts  
 ● Using Boolean operations  
● Applying linear and circular patterning  
● An introduction to concurrent top -down and bottom -up designs  
● Creating a Multi -Part design in a Part Studio  
Models  ● Tray - used for linear patterning  
● Nozzle - used for circular patterning  
● BU35 Cantilever Clamp  
 
 
 
  

 
Before we get started…  
Last week, we learned about fillets and chamfers, which were examples of “Feature Based 
Modeling” that can manipulate existing 3D geometry without a 2D sketch. This week, we will 
learn about booleans, which also manipulate 3D parts, and patterning, which m anipulate parts, 
faces, and features. Then we will use some of these tools and others we’ve learned previously 
in creating our first big project – a Cantilever Clamp. The Cantilever Clamp will all be built in a 
single Part Studio using a Multi -Part modelin g approach.  
 
Boolean Operations  
Boolean Operations  are a fundamental part of CAD, and in fact, you may remember that they 
are actually a mathematical function from way back in algebra class! There are four types of 
Boolean operations in Onshape: New, Union , Subtract, and Intersect. New is used to create 
new parts, and the other three are used to operate on existing parts. Below is a graphical 
representation of how they work. More information on Booleans can be found in the help here, 
and remember, booleans only work when parts interfere with each other (or are just 
touching).  
 
 
To use the Boolean Operations, click the Boolean Tool . A dialog box will show up and you 
can choose among three operations:  

 
 
Notice that there are Union , Subtract , and Intersect  tabs on the top. Each Boolean Operation 
has a “Tools” field, but only Subtract has a “Targets” field since Subtract removes a tool part 
from a target. So in the Subtract exa mple above, the tool parts were the small cylinders, while 
the target was the the large cylinder.  
 
Also notice the “Keep tools” option. If the “Keep tools” option was selected in the example above, 
the tools in the Subtract example (i.e. small cylinders) would appear, as well as the tools in the 
Intersect example (i.e. both the big and small cylinders).  
 
In-Class Exercise #1:  
Open up the public document called “College - Boolean Operations” and make a private copy. 
Perform the three Boolean Operations (Uni on, Subtract, Intersect) on the parts in the 
corresponding Part Studios to create the three models in the first example.  
 
Patterning  
Much like mirroring (which we learned in week 2), patterning is a way to automatically build 
identical geometry in CAD. In  addition, in Onshape it can be “bundled” with boolean operations 
such as subtract and intersect, and the result is a versatile and powerful tool.  
In a Part Studio in Onshape, both 2D and 3D geometry can be patterned, and the patterns can 
be either be line ar or circular. Here are the links to the linear sketch patte


============================================================
WEEK 4
============================================================
Week 4: 3D Modeling - Assemblies  
 
Concepts  
 ● Lesson on degrees of freedom  
● An introduction to assembly Mates  
● Mate Connectors  
● Manipulating part position with the triad  
● Explaining Mates and Relations  
● Animating Mates  
● An introduction to Linked Documents  
● Applying limits to a Mate  
Models  ● BU35 Cantilever Clamp  
● Assembled Vise  
 
 
  

 
About Assemblies  
Until now, we’ve been designing single parts and Multi -Part designs in Onshape Part Studio 
tabs, but now we will discuss assemblies . In Onshape, Assembly Tabs allow us to assemble 
multiple part instances (or assemblies) together, and define the motion (if any) between them. In 
the dynamic world we live in, mostly everything has some sort of movement, so learning how to 
create, build, a nd simulate motion with assemblies is an important topic. For example, the 
common retractable pen is an assembly; the spring -loaded ink cartridge slides up and down the 
main casing. Most everything we deal with in engineering (design, test, manufacture, bu y, sell) 
is an assembly of some sort.  
For designing and manufacturing an assembly, it is important to know which parts go into the 
assembly, how many of each, how they are assembled, and how they should perform. All of this 
critical information can be docu mented by creating an assembly in Onshape, and then creating 
a drawing of that assembly (which will be covered in the next class).  
In an Assembly Tab, we have a new set of tools to use, and therefore we have a new toolbar. 
Where a Part Studio utilizes Sket ches and Features, Assembly Tabs utilize Mates  and 
Relations : 
 
This toolbar allows us to insert parts and subassemblies, and create and manage the kinematic 
constraints between parts. More information on Assemblies can be found in the Onshape Help 
here: https://cad.onshape.com/help/index.htm#assembly.htm  
 
Before we get started…  
A Note about Mate Connectors in Onshape  
 
Much like in sketching, where constraints are used to create relationships between sketch 
entities, Mates  are similarly used to locate parts within an assembly and define the relative 
motion between parts. For example, parts may slide, rotate, swing, etc. Also, just like in 
sketching, it is best practice to “fully constrain” parts in an assembly by using just enough mates 
to fully define the assembly’s motion. In order to accomplish this, you must create relationships 
(called mates), which limit a part’s degrees of freedom . All unconstrained objects have 6 
degrees of freedom in 3D space: these include translation in the X, Y , and Z directions, and 
rotation about the X, Y, and Z axes. If a part is able to move in n number of directions and 
rotations, we say that the part has n degrees of freedom.  
 

Typically, CAD software defines each part’s location and orientation in an assembly by using a 
set of “Assembly Constraints”. An Assembly Constraint typically includes a pair of geometric 
references: one reference to t


============================================================
WEEK 5
============================================================
Week 5: 2D Drawings  
 
Concepts  
 ● An introduction to engineering drawings  
● Creating drawing views, dimensioning, tolerancing, notes  
● Using formats/templates  
● Introducing GTOL/GD&T  
Models  ● Simple models from Week 2  
● Assembled Vise  
 
 
 
 
 
 
 
 
 
 
 
 
  

 
Before we get started…  
A note about Drawings in Onshape  
Engineering Drawings  (also known as Prints, for when they are actually printed) are a vital 
part of the Product Development process. It is critically important to document our designs in a 
clear and c oncise manner, such that the original design intent is communicated to others. 
Engineering Drawings are meant to be shared - with others on the team, such as suppliers and 
partners, immediate teammates and management, manufacturers and assemblers, and in s ome 
cases the customer as well. In its simplest form, an Engineering Drawing is a 2 -D document that 
is used to explain to manufacturing how to make a part or assembly.  
It is very important to learn how to create a “good” drawing, but first we must define w hat “good” 
means. Let’s say that we want to manufacture the part we made in Week 2:  
 
How do we communicate the part’s dimensions accurately to the manufacturers? We need to be 
able to fully communicate the dimensions of the holes, the height of the extru sions, the fillet 
radius, etc., in a clean and efficient way. Of course, adding the base sketch (picture to the left 
below) helps to communicate how the part looks like from the Top view (right):  
 
But sometimes, even presenting the 2D sketches that make  the part isn’t enough. Notice that 
the base sketch doesn’t exactly correspond with the Top view of the final model; the bigger hole 
is modified, and the part is filleted. We somehow need to combine the information provided by 
the two images above. This is  where Engineering Drawings come in play.  
 
Many companies and industries have their own standards and best practices, which we will not 
try to cover here. Instead, we will focus on creating drawings which are easy to read, organized, 
have a good use of sp ace on the sheet, and are consistent. Professional designers and 

engineers will agree that creating a “good” drawing is as much an art as it is a science. Here is 
an example of an Engineering Drawing of our example part (annotations in blue are not part of  
the Drawing, but we added them to label some key features):  
 
 
We’ll be making this drawing in our first exercise. Since Engineering Drawings are a 
communication tool, you can think of the information on them as a language. Engineering 
Drawings usually h ave standard information such as the Drawing Format, geometry from 
different views (Top, Isometric, Front, and Right etc.), dimensions, and tolerances. With enough 
information, any manufacturing company should be able to make the exact same part just by 
looking at the Engineering Drawing.  
In an effort to standardize how this information is communicated, there are 


============================================================
WEEK 6
============================================================
Week 7: Introduction to Product Design - 
Iterative Design  
 
Concepts  
 ● Continuing Bluetooth Speaker project  
● Using FeatureScript for screw bosses and ribs  
● Adding additional model detail  
● Version control and history  
● Re-ordering parametric features  
● Exercising top -down design  
Models  ● Finished Bluetooth Speaker Part Studio  
 
 
 
 
  

 
Bluetooth Speaker Continued  
In this lesson, we will continue with designing our Bluetooth Speaker. We are going to build on 
our existing geometry, and use custom features like ribs and bosses, which were made using 
Onshape’s FeatureScript language. Finally, we are going to learn how to manage our CAD data 
using Onshape’s built -in History, Versioning and Branching tools. By the end of this lesson, we 
will have completed the Part Studio for the Bluetooth Speaker:  
 
 
 
 
  

 
Before continuing with our model, let’s create a Version  of it first.  
1. A version is an instance of our model at a specific, and usually important, point in time 
that we frequently want to go back to. Since we’ve exchanged models with our partner 
and made changes to accommodate manufacturing restrictions, let’s capture this 
milestone. Click on the “Create version” button  in the top -left corner of the screen.  
2. Let’s create version “Base Frame” and give it a simple description, “This version has the 
Bluetooth Speaker in its basic frame.” Then finish off by clicking on the “Crea te” button:  
  
 
3. Now if we click on the “Manage versions and history” button  in the top -left corner of 
the screen, we can see the versions and history flyout. Here we can see the “Start” 
(where we started the model) and the “Main” (our current state), wit h our “Base Frame” 
version in between.  
 
 
Now, let’s continue with our model! We’ll be talking more about Versions later.  

4. First, let’s add a chamfer to the front corner, to make the speaker frame look a little 
better. Make sure to get the directions corr ect, the long face should be facing forward, 
not up. Also, let’s name this feature, “Frame Chamfer”:  
 
 
Design Intent Check : Now we’re going to be making the speaker box, highlighted in the 
pictures below. Notice how it sits on the Frame and how it relates  to the small speaker.  
 

 
   
 
5. Next, let’s design the enclosure for the small speakers. Start by creating a sketch on the 
back face of the small speaker mount. Locate it by constraining it to the center of the 
circle in our main sketch, and make sure to fully constrain the square:  
 

 
 
6. Extrude the sketch 0.25 in, and add it to the Frame:  
 

 
 
7. Next, let’s mirror this feature over to the other side (using the Right Plane):  
 

 
 
8. Next, let’s begin creating the speaker enclosure for the small speaker. To do this, select 
the face of the extrusion we just created, and extrude that outwards as a new part, 0.75 
in. Once created, name the new part “Speaker Box”:  
 




============================================================
WEEK 7
============================================================
Week 8: Product Design - Advanced 
Assembly & Rest of Design Process  
 
Concepts  
 ● Continuing Bluetooth Speaker project  
● Using Linked Documents for standard hardware  
● Advanced Assembly concepts  
● Applying “snap mode” in Assembly  
● Grouping in Assembly  
● Replicating for fasteners  
Models  ● Finished Bluetooth Speaker document, including assembly, 
drawing, etc.  
 
 
  

 
Bluetooth Speaker Continued  
In this lesson, we will finish our Bluetooth speaker design by creating the battery pack, and 
assembling all of the parts with the correct hardware. During assembly, we will leverage 
advanced assembly tools like Snap Mode, Group, and Replicate. At the end of this lesson our 
design will be complete!  
 

 
 
 
 
  

 
 
Design Intent Check : We’re going to be making the batteries in another Part Studio. The 
batteries will fit in the bottom of the speaker and will be covered by the battery cover and 
stand (not shown in the pictures below). We’ll be mating the batteries at the end of the lesso n. 
 
 
 
 
1. Before we start assembling, we need to build our Lithium Ion battery pack. Start by 
opening our document, and creating a new Part Studio Tab (click the + button in the 
bottom left corner). Let’s name the Part Studio “Batteries”. Start by creating  a sketch on 
the Front Plane (use constraints as necessary to achieve a fully constrained sketch):  

 
 
2. Next, extrude it out symmetrically:  
 

 
 
3. Next, create a 0.05” fillet on both ends:  
 
 
 

4. Finally, let’s add a Mate Connector, as this will allow us to assemble it easily. Unhide the 
original sketch, and click on Mate Connector . A dialog box will show up, but we can 
ignore it for now. Place the Mate Connector at the center, making sure the Bl ue axis is 
pointed towards the right side, like this:  
 
 
Pro Tip: Adding a Mate Connector here (within the Part Studio) is a good idea when there is no 
readily available geometry to easily Mate the part to the assembly. In real life, this battery pack 
is installed during assembly and just “floats” in place in the battery compartment. From a design 
standpoint, it’s best to just place it in the center of the compartment. Since there is no geometry 
to signify the center of the battery pack, we’ll use the sketc h here. In this case, we strategically 
built the model in a way that we could take advantage of this. This is a great example of thinking 
ahead, and utilizing design intent.  
 
5. Notice that the Mate Connector dialog box was automatically filled out. Click th e green 
check. Okay, now we are ready to assemble the Bluetooth speaker. First, let’s open our 
assembly tab, and select “Insert”. Click on the Speaker Studio which has our Bluetooth 
Speaker design in it:  

 
 
6. Now, just click the Green check box. This will dr op everything from our design into our 
Assembly Studio in it’s default location (the location it was designed in):  
 




============================================================
WEEK 8
============================================================
Week 9: Advanced Geometry & Design for 
Plastics  
 
Concepts  
 ● Starting Chopper project  
● Advanced part modeling  
● Advanced top -down design  
● Applying drafts  
● Using surfaces  
● Splitting parts  
● Using variables/expressions  
● Editing appearance/transparency  
Models  ● Chopper - preliminary design  
 
  

 
Mini Chopper Overview  
Even early in the development cycle, designers need to think about how a product is going to be 
made. Over the next few lessons, we will be designing a mini food Chopper. In doing so, we will 
discuss several manufacturing methods including Plastic Injectio n Molding and Computer 
Numerically Controlled (CNC) Machining.  
 
Through this, we will learn about advanced geometry that can be created within Onshape. We 
will learn about draft and several ways how to apply it, and we will create intelligent CAD models 
using variables and equations. We are also going to use tools in Onshape, such as interference 
detection and mass properties, to design, analyze, and animate an electric motor driven gear 
drivetrain. Finally, we will discuss the concept of Concurrent Enginee ring, and we’ll use some of 
the unique tools that Onshape has to facilitate collaboration.  
 
 

In this lesson, we will focus on creating the overall design for the chopper, before we start 
designing the detailed inside “guts”. Just like with the speaker, we  will focus on a “top -down” 
design approach, and so we will start with several “layout sketches”. By the end of this lesson, 
we will have the overall design complete, and some of the details of the main plastic parts as 
shown here:  
 
 
Design Intent Check : Before we get started, let’s study the layout and the parts, as this will 
help us develop a strategy for capturing the design intent of the assembly, as well as stay 
oriented as we build it up. The transparent bowl is on the left and centered around the origin, 
which is highlighted in blue at the bottom. In addition, we have 3 opaque plastic parts, the 
Top, the Main Body, and the Base. The seams between the parts are highlighted in blue as 
well:  

 
 
Let’s also take a look at the chopper without the Base an d Bowl. The Top and Main Body are 
highlighted below. Notice how the Main Body interacts with the parts that are not highlighted, 
which we will build next week. Hopefully this will give you an idea of why we added certain 
features to the Main Body.  
 
 
1. Let’s start by creating our layout sketch on the top plane. Here it is viewed in the “Top” 
orientation. Take note of the “3.5” dimension as that is very important, and notice that 
the left side of that dimension is our origin (highlighted in blue). Also no tice that the two 
lines are horizontal. Name the new sketch “Layout Sketch”:  
 

 
 
2. Next, extrude the entire profile up 4.5”. Rename the new part “Main Body”:  
 

 
 
3. Now, referencing the bowl geometry, and extruding in two directions, remove material in 
the foll owing manner (the model has 


============================================================
WEEK 9
============================================================
Week 10: Design for Manufacturing: CNC 
Machining  
 
Concepts  
 ● Using the Hole Tool  
● Using FeatureScript for spur gears  
● Importing Solidworks Pack/Go files  
● Direct editing an existing part (modify fillet, delete/move/replace 
face)  
● An introduction to the Onshape  App Store (through a look at a 
CAM app)  
Models  ●   Chopper - Drivetrain completed  
 
 
  

 
Mini Chopper Continued  
In this lesson, we are going to focus on the “guts” of our Chopper - the rotating motor drive 
assembly, the frame that it all mounts to, and all of the related gears, bushings, and shafts.  
 
In doing so, we will use the Hole Feature, and additional Feature Script features to design the 
gear train, including a cool double gear. We will import new external files types, and then apply 
some Direct Modeling techniques to them. And finally, we will discuss design techniques for 
Computer Numerically Controlled (CNC ) manufacturing processes, and then take a look at the 
Computer Aided Manufacturing (CAM) apps in the App Store.  
 
 

 
Design Intent Check : We’re going to start by making a Drivetrain Frame, highlighted below. 
The Drivetrain Frame houses the gears and hooks onto the Main Body. In the steps that 
follow, notice how we reference the Main Body when creating the Drivetrain Frame.  
 
 
 
1. Start by creating a new sketch (rename it “Drivetrain Layout”) on the inside surface of 
the Main Body (highlighted in orange). The sketch is shown here twice, in the “Bottom” 
orientation; with and without the Main Body. Note the (blue) references between the 
screw bosses on the Main Body, and the circles in the sketch. Also note the use of a 
construction line, and symmetry:  
 

 
 
 
2. Next, extrude out a new part, called Drivetrain Frame, away from the Main Body:  
 

 
 
3. Next, create a new sketch, called “Drivetrain Top Sketch” on top of the new Drivetrain 
Frame part (the new face created by the extrude, not the same plane as the sketch in 
step 1). Note the “extra” sketch points that have been added to the construction lin e, and 
located at the center of the frame holes. Here it is viewed in the “Bottom” orientation:  
 

 
 
4. Next, extrude it away from the Main Body:  
 
 
 
5. Next, using our drivetrain sketch as a reference, create two bosses on the right side of 
our Frame:  
 

 
 
6. Next, create a new sketch on top of these bosses, and locate two sketch points, , at 
the center:  
 
 
Hole Feature  
Holes are unique features in that they usually have a pretty standard geometry: a cylinder, with 
either a chamfer (countersink), or another cylinder (counterbore) at the end of it. In addition, in 

manufacturing, there are only a few ways to make a hole, an d by far the most popular method is 
to use a drill. The cheapest way to make a hole is to use a standard size, as the tooling will 
already be in the machine shop. As a result, Onshape has a special Hole Feature which has a 
pre-populated library of standard  hole sizes, and sta


============================================================
WEEK 10
============================================================
Week 11: Advanced Geometry Techniques & 
Product Data Management  
 
Concepts  
 ● Advanced part modeling  
● Lofting  
● Importing and manipulating sketch picture  
● Sketching with splines  
● Embossing logo  
● Drawing a helix to make a spring  
● Using Branch/Compare/Merge features  
Models  ● Chopper Design complete  
 
  

 
Mini Chopper Continued  
In this lesson, we are going to finish up the design of our Chopper, including some of the more 
advanced geometric features.  
 
In doing so, we will use the loft feature to create the blade, we will import a picture, and trace 
over it in order to put a logo on the front of the Main Body, and we will create a spring by using 
the helix feature. At the end of this lesson, our chopper will be ready for assembly!  
 
 
 
 
 

Design Intent Check : We’re going to start by making the Blade of our Chopper. Where is the 
Blade located? Could you guess how we’re going to make the two sharp blades?  
 
 
 
1. Start by creating a new sketch on the Front Plane, and name it “Blade Housing Profile”. 
Several features will be made from it, so it has some extra details. Several layouts are 
provided below. Note the tangent relationship between the fillet radius in the Blade 
Housing Profile and the swaged feature of the shaft:  
 

 

 
 
 
 

2. Next, create a new part by revolving the entire profile around. Rename the new part 
“Blade”:  
 
Here is a cross -section view for clarity:  

 
 
3. Next, we’ll create a Mate Connector for the Blade to help us in assembly. Use the top of 
the shaft as a reference for its location, but make sure that the Blade is the “Owner part.” 
In other words, use the grey shaft to locate the Mate Connector, but assig n the blade as 
its owner part, so that the Mate Connector follows the blade wherever it goes.:  
 

 
 
Loft 
We’ve created lofts before, but now we will use it to create the sharp blade for our Chopper. A 
Loft is a powerful tool which is commonly used to creat e advanced geometry like propellers, fan 
blades, and aircraft wings, where the cross section changes shape, size, and orientation. We 
will use that approach to create the blade, so we can see just how powerful it is. It may seem 
like our cross section sket ches are overly complicated, but in reality, we are creating a robust 
framework to make sure we have full control over our blade profile.  
 
4. First, create the following sketch on top of the outer surface of the Blade (the sketch 
plane is highlighted by the a rrows). Note the addition of a sketch point at the midpoint of 
the arc:  




============================================================
WEEK 11
============================================================
Week 12: Advanced Tools & Design for 
Assembly   
 
Concepts  
 ● Using section -view to look for interference  
● Applying Gear Relations  
● Applying materials and using Mass Properties  
● Using the explode view from App Store  
● Making edits from Onshape Mobile  
● Exporting Solidworks files  
Models  ● Chopper - assembly, documentation & wrap -up 
  
  

 
Mini Chopper Finished  
In this lesson, we are going to complete the Mini Chopper project, and wrap up the course with 
a few last concepts. We’ll assemble our Mini Chopper and leverage the App Store to create 
some typical design Documentation in preparation for manufacturing rele ase.  
 
At the end of this lesson, we will know how to apply a gear relation, and use some of the design 
tools within Onshape such as measuring, applying materials, analyzing Mass Properties, and 
using cross -section visualization to help us detect interferen ces between parts in our assembly.  
When complete, we should have Full Design Documentation like this:  
 
 
 
 
  

 
Cross -Section & Interferences  
Before we get started, the Mini Chopper design may have been altered as a result of the 
Concurrent Design exercise from the previous week. If that’s the case, you may restore to the 
version “Baseline” to follow along closely with this lesson.  
 
1. One of the f irst things we want to check while we prepare our design for assembly is if 
there are any interferences between parts, or else our Mini Chopper will not fit together 
properly. To do this, we will create a cross -section through the center of our design. Fir st, 
preselect the “Front” plane in the feature tree, and then select “Section view” from the 
visualization pull -down menu:  
 
 
 
2. Once we select it, we should get a section view, where the entire design studio has been 
cut in half. Here it is, shown in the “F ront” view orientation. If we look closely, we’ll notice 
that several parts interfere with each other, and the interferences are shown in red:  
 

 
 
3. Interference is shown between the bushing and the Main Body, and between the 
Drivetrain Frame and the Main Bo dy. The closer you zoom in, the detail of the 
interference becomes easier to see:  
 

 
 
4. At this point, we have several ways in which we could fix this clearance. Let’s start by 
updating the design of the Main Body. Edit the “Spillway Sketch” by double -clicki ng on it 
in the feature list. Notice how the cross -section remains:  
 

 
 
5. Next, update the 0.86 dimension to 0.90, and click on the final button in the dialog box:  
 
 
6. At first glance, it looks like we may have fixed it, but when we zoom in for a closer look,  
we see that it’s still not fixed:  
 

 
 
7. Let’s fix the clearance once and for all by increasing the dimension to 1.0:  
 
Pro Tip: This is a really smart way to work. By utilizing the cross section view, and the Final 
button on our sketch dialog box, we can easily and quickly fix any interferences we have in our 
design. The 


