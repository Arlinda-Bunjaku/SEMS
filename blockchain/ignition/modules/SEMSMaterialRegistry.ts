import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SEMSMaterialRegistryModule = buildModule(
  "SEMSMaterialRegistryModule",
  (m) => {
    const registry = m.contract("SEMSMaterialRegistry");

    return { registry };
  }
);

export default SEMSMaterialRegistryModule;