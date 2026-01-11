/**
 * Run this script in Chrome DevTools console on the extension's service worker
 * to fill the base resume data.
 *
 * Steps:
 * 1. Open chrome://extensions
 * 2. Find "HH Job AutoApply" and click "Service Worker" link
 * 3. Paste this entire script in the Console and press Enter
 */

const resumeData = {
  fullName: "Alexander Sakhatskii",
  title: "Full Stack Engineer",
  summary:
    "Experienced Full Stack Engineer with a proven track record in building scalable web applications, cloud infrastructure, and leading development teams. Strong expertise in TypeScript, React, Node.js, and cloud technologies.",
  experience: [
    {
      company: "Evolv FlexCare",
      position: "Senior Full Stack Engineer",
      startDate: "2025-02",
      endDate: null,
      description:
        "Leading development of healthcare tech platform with React Native and Node.js. Implementing AI-powered features and optimizing system performance.",
      achievements: [
        "Building scalable healthcare platform serving thousands of users",
        "Implementing AI-driven patient care features",
      ],
    },
    {
      company: "Yandex.Cloud",
      position: "Senior Frontend Developer",
      startDate: "2024-01",
      endDate: "2025-01",
      description:
        "Developed cloud console interfaces and infrastructure management tools. Built data visualization dashboards and monitoring systems.",
      achievements: [
        "Rebuilt cloud service console with React and TypeScript",
        "Created interactive Kubernetes management interface",
        "Implemented real-time infrastructure monitoring dashboards",
      ],
    },
    {
      company: "RTK",
      position: "Frontend Technical Lead",
      startDate: "2021-06",
      endDate: "2023-12",
      description:
        "Led frontend development team. Architected and built large-scale mapping and data visualization applications. Managed code quality and team processes.",
      achievements: [
        "Led team of 8 frontend developers",
        "Built GIS platform with Leaflet.js and D3.js",
        "Reduced bundle size by 40% through optimization",
        "Established code review and testing practices",
      ],
    },
    {
      company: "Linkorn",
      position: "Full Stack Developer",
      startDate: "2019-03",
      endDate: "2021-06",
      description:
        "Full-stack development with React, Node.js, and PostgreSQL. Built APIs, implemented real-time features, and deployed applications.",
      achievements: [
        "Developed real-time collaboration features with WebSockets",
        "Built REST and GraphQL APIs",
        "Implemented CI/CD pipelines with Docker",
      ],
    },
  ],
  education: [
    {
      institution: "Chernyshevsky State University",
      degree: "Bachelor of Computer Science",
      year: 2022,
    },
  ],
  skills: [
    "TypeScript",
    "JavaScript",
    "React",
    "React Native",
    "Next.js",
    "Node.js",
    "GraphQL",
    "Redux",
    "MobX",
    "Effector",
    "D3.js",
    "Leaflet.js",
    "PostgreSQL",
    "MongoDB",
    "Docker",
    "Kubernetes",
    "Terraform",
    "AWS",
    "GCP",
    "Git",
    "CI/CD",
  ],
  contacts: {
    email: "a.sakhatskii@gmail.com",
    phone: "+995599946514",
    telegram: "",
  },
};

// Save to Chrome storage
chrome.storage.local.set({ baseResume: resumeData }, () => {
  console.log("Resume data saved successfully!");
  console.log("Open Options page to verify the data.");
});
